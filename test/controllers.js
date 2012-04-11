var path = require('path');
var express = require('express');
var app = express.createServer();
app.disable('quiet');

require('./spec_helper').init(exports);
require('../lib/onrailway').init(app);

var listener;
railway.controller.addBasePath(path.join(__dirname, '.controllers'), null, {
    event: function () {
        if (listener) {
            listener.apply(this, [].slice.call(arguments));
        }
    }
});

function getController(name) {
    return railway.ControllerBridge.loadController(name);
}

function fakeRequest(method, path) {
    return {
        method: method,
        url: path,
        query: {}
    };
}

it('should allow to change default layout', function (test) {
    var ctl = getController('layout_test');
    var req = fakeRequest('GET', '/test');
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

it('should allow to reset controller flow via passing Error to next', function (test) {
    var ctl = getController('throwing');
    var req = fakeRequest('GET', '/');
    ctl.perform('neverWillBeExecuted', req, {render: function (viewName, params) {
        test.fail(true);
    }}, function (err) {
        test.equal(err.constructor.name, 'Error');
        process.nextTick(test.done);
    });
});

it('should handle before filters', function (test) {
    var ctl = getController('before_filters');
    listener = console.log;
    ctl.perform('action4', req(), {});
    test.done();
});

function req() {
    return fakeRequest('GET', '/');
}

