var path = require('path');

require('./spec_helper').init(exports);
app.disable('quiet');
app.enable('log actions');

var listener;
railway.controller.addBasePath(path.join(__dirname, '.controllers'), null, {
    event: function () {
        if (listener) {
            listener.apply(this, [].slice.call(arguments));
        }
    }
}, app.root);

it('should allow to change default layout', function (test) {
    var ctl = getController('layout_test');
    var req = fakeRequest('POST', '/test');
    var layout = ctl.layout;
    ctl.perform('test', req, {render: function (viewName, params) {
        test.equal(params.layout, 'layouts/test_layout');
        layout(false);
        ctl.perform('test', req, {render: function (viewName, params) {
            test.equal(params.layout, false);
            test.done();
        }});
    }});
});

it('should allow to skip flow via passing Error to next', function (test) {
    var ctl = getController('throwing');
    ctl.perform('neverWillBeExecuted', req(), {
        render: function (viewName, params) {
            test.fail(true);
        }
    }, function (err) {
        test.equal(err.constructor.name, 'Error');
        process.nextTick(test.done);
    });
});

it('should handle before filters', function (test) {
    var ctl = getController('before_filters');
    asyncLoop(['action1', 'action2', 'action3', 'action4'], function (a, n) {
        var stack = [];
        listener = function (kind) {
            stack.push(kind);
            if (kind.match(/action\d/)) {
                check(kind, stack);
                n();
            }
        };
        ctl.perform(a, req(), {});
    }, test.done);

    var templateStacks = {
        action1: 'onlyOneAction|onlyFewActions|exceptOneAction|exceptFewActions|action1',
        action2: 'runBeforeAll|onlyFewActions|exceptOneAction|exceptFewActions|action2',
        action3: 'runBeforeAll|action3',
        action4: 'runBeforeAll|exceptOneAction|action4'
    };
    function check(action, stack) {
        test.equal(stack.join('|'), templateStacks[action]);
    }
});

it('should be able to load all controllers', function (test) {
    railway.controller.loadAll();
    test.done();
});

it('should allow to load functions declared in another ctl', function (test) {
    var ctl = getController('inclusion_test');
    ctl.perform('test', req(), {});
    listener = function (exported) {
        test.ok(typeof exported.user === 'function');
        test.ok(typeof exported.admin === 'function');
        test.ok(exported.user.name === 'requireUser');
        test.ok(exported.admin.name == '');
        test.done();
    };
});

it('should protect POST requests from forgery', function (test) {
    var ctl = getController('csrf_test');
    var r = req('POST');
    r.session = { };
    // call without csrf token in session and body
    ctl.perform('test', r, {});
    listener = function () {
        test.ok(ctl.protectedFromForgery());
        test.ok(r.session.csrfToken);
        test.ok(r.csrfToken);
        r.req = '?';
        r.body = { authenticity_token: r.csrfToken, password: '123' };
        ctl.perform('test', r, {});
        listener = function () {
            r.body = {};
            ctl.perform('test', r, {send: function (code, message) {
                test.equal(code, 403);
                r.originalMethod = 'GET';
                ctl.perform('test', r, {});
                listener = test.done;
            }});
        };
    };
});

function req(method) {
    return fakeRequest(method || 'GET', '/');
}

function getController(name) {
    return railway.controllerBridge.loadController(name);
}

function fakeRequest(method, path) {
    return {
        method: method,
        originalMethod: method === 'GET' ? 'GET' : 'POST',
        url: path,
        query: {},
        param: function (name) {
            return this.body[name];
        }
    };
}

function asyncLoop(collection, iteration, complete) {
    var self = this;
    var item = collection.shift();
    if (item) {
        iteration.call(self, item, function next() {
            asyncLoop.call(self, collection, iteration, complete);
        });
    } else if (typeof complete === 'function') {
        complete.call(self);
    }
}

