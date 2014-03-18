var app = getApp();
var compound = app.compound;

function initApp() {
    var s = compound.structure;
    s.controllers.ctl = function Ctl(){};
    s.views['ctl/view'] = 'exists';
    s.views['layouts/application_layout'] = 'layout';

};

describe('controller-extensions', function() {

    before(initApp);

    var controller, rendered, params = {}, req = {
        app: app,
        param: function(what) {
            return params[what];
        }
    }, res = {
        render: function (file, params, callback) {
            rendered.push(file);
            if (callback) callback();
        }
    };

    function declareAndRun(action, test) {
        controller.action(action.name, action);
        controller.perform(action.name, req, res, test);
    }

    describe('rendering', function() {

        beforeEach(function() {
            controller = compound.controllerBridge.getInstance('ctl');
            rendered = [];
        });

        it('should render existing view', function(done) {
            declareAndRun(function renderExisting(c) {
                c.render('view');
            }, function() {
                rendered.should.eql(['exists', 'layout']);
                done();
            });
        });

        it('should render file without layout', function(done) {
            declareAndRun(function renderNoLayout(c) {
                c.render('view', {layout: false});
            }, function() {
                rendered.should.eql(['exists']);
                done();
            });
        });
    });

    describe('safe', function() {
        beforeEach(function() {
            controller = compound.controllerBridge.getInstance('ctl');
            rendered = [];
        });

        it('should call callback when no error', function(done) {
            var args;
            declareAndRun(function renderDifferentFormat(c) {
                doAsyncStuff(c.safe(function() {
                    args = Array.prototype.slice.call(arguments);
                    c.next();
                }));
            }, function() {
                args.should.have.lengthOf(1);
                args[0].should.equal('he');
                done();
            });
            function doAsyncStuff(cb) {process.nextTick(function(){cb(null, 'he')})}
        });

        it('should call c.next(err) when error', function(done) {
            var called = false;
            declareAndRun(function renderDifferentFormat(c) {
                doAsyncStuff(c.safe(function() {
                    called = true;
                }));
            }, function() {
                called.should.be.false;
                done();
            });
            function doAsyncStuff(cb) {process.nextTick(function(){cb(new Error)})}
        });
    });

    describe('format', function() {
        beforeEach(function() {
            controller = compound.controllerBridge.getInstance('ctl');
            rendered = [];
            delete params.format;
        });

        it('should render desired format', function(done) {
            var args;
            params.format = 'mobile';
            declareAndRun(function renderDesiredFormat(c) {
                c.format({
                    mobile: function() {
                        c.next();
                    }
                });
            }, done)
        });

        it('should render default format', function(done) {
            var args;
            params.format = 'unknown';
            declareAndRun(function renderDefaultFormat(c) {
                c.format({
                    html: function() {
                        c.next();
                    }
                });
            }, done)
        });

        it('should render customized default format', function(done) {
            var args;
            app.set('default format', 'json');
            params.format = 'unknown';
            declareAndRun(function renderDefaultFormat(c) {
                c.format({
                    json: function() {
                        c.next();
                        delete app.settings['default format'];
                    }
                });
            }, done)
        });
    });

});
