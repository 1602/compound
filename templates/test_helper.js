var app = require('railway').createServer();

exports.controller = function (controllerName, exp) {

    exports.init(exp);

    // trick
    it('init', function (test) { process.nextTick(function () { test.done(); }); });

    var http = require('http');
    var sinon  = require('sinon');
    var assert = require(require.resolve('nodeunit').replace(/index\.js$/, 'lib/assert'));
    var nodeunit = require('nodeunit');

    assert.render = function (template, message) {
        if (!this.res.render.calledWith(template) && !this.res.render.calledWith(controllerName + '/' + template)) {
            assert.fail([template, controllerName + '/' + template],
                this.res.render.args.map(function (x) { return x[0]; }),
                message || 'Render template',
                'in',
                assert.render);
        }
    };

    assert.redirect = function (path, message) {
        if (this.res.statusCode !== 302) {
            assert.fail(this.res.statusCode, 302, 'Status code is not 302', '===', assert.redirect);
        }
        var realPath = require('url').parse(this.res.headers.location).pathname;
        if (realPath !== path) {
            assert.fail(realPath, path, message || 'Wrong location', '===', assert.redirect);
        }
    };

    assert.send = function (path, message) {
        if (this.res.statusCode !== 200) {
            assert.fail(this.res.statusCode, 200, 'Status code is not 200', '===', assert.redirect);
        }
        this.res.send.calledWithExactly(path);
    };

    assert.success = function (template, message) {
        if (this.res.statusCode !== 200) {
            assert.fail(this.res.statusCode, 200, message || 'Status code is not 200', '===', assert.status200);
        }
    };

    assert.flash = function (kind) {
        if (!this.req.flash.called) {
            assert.fail(this.req.flash.called, true, 'req.flash() does not called', '===', assert.flash);
        } else if (!this.req.flash.calledWith(kind)) {
            assert.fail(this.req.flash.args[0][0], kind, 'req.flash() does not called with ' + kind, '===', assert.flash);
        }
    };

    assert.assign = function (name, value) {
        if (!this.req.sandbox.hasOwnProperty(name)) {
            assert.fail(name, this.req.sandbox, 'Not assigned', 'in', assert.assign);
        } else if (typeof value !== 'undefined') {
            if (typeof value == 'function') {
                if (!value(this.req.sandbox[name])) {
                    assert.fail(this.req.sandbox[name], '[user check]', 'Assigned value doesn\'t matched', '[user check]', assert.assign);
                }
            } else if (value !== this.req.sandbox[name]) {
                assert.fail(this.req.sandbox[name], value, 'Assigned value doesn\'t matched', '===', assert.assign);
            }
        }
    };

    assert.get = stubRequest('GET');
    assert.post = stubRequest('POST');
    assert.put = stubRequest('POST', 'PUT');
    assert.del = stubRequest('POST', 'DELETE');

    var origTest = nodeunit.types.test;
    nodeunit.types.test = function () {
        var test = origTest.apply(this, Array.prototype.slice.call(arguments));
        test.wait = function (n) {
            var test = this;
            var origDone = test.done;
            test.done = function () {
                console.log('call', n);
                if (--n === 0) {
                    test.done = origDone;
                    console.log('hey');
                    test.done();
                }
            }.bind(this);
        };

        return test;
    };

    app.enable('quiet');
    app.enable('models cache');

    function stubRequest (method, _method) {
        return function (url, callback) {
            var req = new http.IncomingMessage;
            var res = new http.ServerResponse({method: 'NOTHEAD'});

            res.render   = sinon.spy(res.render);
            res.send     = sinon.spy(res.send);
            res.redirect = sinon.spy(res.redirect);
            res.headers  = {};
            res.header   = function (header, value) {
                res.headers[header.toLowerCase()] = value;
            };

            req.headers  = {
                host:'localhost'
            };

            req.flash    = sinon.spy(req.flash);
            req.connection = {};
            req.url      = url;
            req.method   = method;

            if (method === 'POST') {
                if (typeof callback === 'object')
                {
                    req.body = callback;
                    callback = arguments[2];
                }

                if (_method)
                {
                    req.body._method = _method;
                }
            }

            res.end = function () {
                this.req = req;
                this.res = res;
                callback.call(this);
            }.bind(this);

            app.handle(req, res);
        }
    };

};

var group_name = false, EXT_EXP;
function it (should, test_case) {
    check_external_exports();
    if (group_name) {
        EXT_EXP[group_name][should] = test_case;
    } else {
        EXT_EXP[should] = test_case;
    }
}

global.it = it;

function context(name, tests) {
    check_external_exports();
    EXT_EXP[name] = {};
    group_name = name;
    tests({
        before: function (f) {
            it('setUp', f);
        },
        after: function (f) {
            it('tearDown', f);
        }
    });
    group_name = false;
}

global.context = context;

exports.init = function (external_exports) {
    EXT_EXP = external_exports;
    if (external_exports.done) {
        external_exports.done();
    }
};

function check_external_exports() {
    if (!EXT_EXP) throw new Error(
        'Before run this, please ensure that ' +
        'require("spec_helper").init(exports); called');
}
