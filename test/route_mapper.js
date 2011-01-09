var assert = require('assert'),
    sinon = require('sinon'),
    app = {},
    action_observer = require('../lib/action_observer');

require('vows').describe('Routes mapper').addBatch({
    'basic abilities': {
        topic: function () {
            return {
                app: app,
                mapper: new (require('../lib/route_mapper'))(app)
            };
        },
        'should create route for get method': function (t) {
            var controller = {action: function () {}};
            t.app.get = sinon.spy(function (path, action) {
                assert.isFunction(action);
                assert.equal(path, '/');
            });
            action_observer.load_controller = sinon.spy(function () {
                return controller;
            });
            t.mapper.get('/', 'controller#action');
            assert.isTrue(true);
        }
    }
}).export(module);
