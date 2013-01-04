var path = require('path');
var fs = require('fs');

require('./spec_helper').init(exports);
app.disable('quiet');
app.enable('log actions');

compound.controllerBridge.root = __dirname + '/.controllers';
compound.structure = function () {
    return {
        controllers: (function () {
            var r = {};
            var dir = __dirname + '/.controllers';
            fs.readdirSync(dir).forEach(function (f) {
                r[f.replace('.js', '')] = fs.readFileSync(dir + '/' + f).toString();
            });
            return r;
        })(),
        helpers: {}
    };
}

var listener;
compound.controller.extensions.event = function () {
    if (listener) {
        listener.apply(this, [].slice.call(arguments));
    }
    this.next();
};

it('wait a little pause', function (test) {
    setTimeout(test.done, 100);

});

it('should allow to load functions declared in another ctl', function (test) {
    var ctl = getController('inclusion_test');
    listener = function (exported) {
        test.ok(typeof exported.user === 'function');
        test.ok(typeof exported.admin === 'function');
        test.ok(exported.user.name === 'requireUser');
        test.ok(exported.admin.name == '');
        listener = function () {};
        test.done();
    };
    ctl.perform('test', req(), {});
});

// todo: move to kontroller
// it('should protect POST requests from forgery', function (test) {
//     var ctl = getController('csrf_test');
//     var r = req('POST');
//     r.session = { };
//     // call without csrf token in session and body
//     listener = function () {
//         test.ok(ctl.protectedFromForgery());
//         test.ok(r.session.csrfToken);
//         test.ok(r.csrfToken);
//         r.req = '?';
//         r.body = { authenticity_token: r.csrfToken, password: '123' };
//         listener = function () {
//             r.body = {};
//             ctl.next();
//             process.nextTick(function () {
//                 ctl.perform('test', r, {send: function (code, message) {
//                     test.equal(code, 403);
//                     r.originalMethod = 'GET';
//                     ctl.next();
//                     process.nextTick(function () {
//                         listener = function () {
//                             ctl.next();
//                         };
//                         ctl.perform('test', r, {}, test.done);
//                     });
//                 }});
//             });
//         };
//         ctl.next();
//     };
//     ctl.perform('test', r, {}, function () {});
// });

function req(method) {
    return fakeRequest(method || 'GET', '/');
}

function getController(name) {
    return compound.controllerBridge.loadController(name);
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

