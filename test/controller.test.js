var should = require('./init.js');
var app;
describe('controller', function() {

    before(function(done) {
        app = getApp();
        app.compound.on('ready', function() {
            done();
        });
    });

    it('should be reusable', function(done) {
        function Controller() {
        }
        var f = 14, a = 24;
        Controller.prototype.first = function first(c) {
            f = 41;
            c.next();
        };
        Controller.prototype.second = function second(c) {
            a = 42;
            c.next();
        };
        app.compound.structure.controllers.test = Controller;
        app.compound.controllerBridge.callControllerAction('test', 'first', {}, {}, function(err) {
            should.not.exists(err);
            app.compound.controllerBridge.callControllerAction('test', 'second', {}, {}, function(err) {
                should.not.exists(err);
                f.should.equal(41);
                a.should.equal(42);
                done();
            });
        });
    });
});
