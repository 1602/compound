var app = require('railway').createServer();

exports.controller = function (controllerName) {

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
    }

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



    // app.enable('quiet');
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
            if (method === 'POST' && typeof callback === 'object') {
                req.body = callback;
                if (_method) req.body._method = _method;
                callback = arguments[2];
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
