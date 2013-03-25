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

    describe('rendering', function() {

        var controller, rendered, req = {}, res = {
            render: function (file, params, callback) {
                rendered.push(file);
                if (callback) callback();
            }
        };

        function declareAndRun(action, test) {
            controller.action(action.name, action);
            controller.perform(action.name, req, res, test);
        }

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

});
