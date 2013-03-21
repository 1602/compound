var app = getApp();
var compound = app.compound;

describe('controller-extensions', function() {

    var controller = {
        res: {},
        req: {},
        compound: compound,
        controllerName: 'controller',
        actionName: 'view',
        context: {inAction: false},
        prepareViewContext: function() {},
        locals: {layout: false},
        renderView: compound.controllerExtensions.renderView
    };

    it('should render existing view', function(done) {
        compound.structure.views['controller/view'] = 'exists';
        controller.res = {
            render: function (file) {
                file.should.equal('exists');
                done();
            }
        };
        compound.controllerExtensions.render.call(controller);
    });

    it('should throw when render missing view', function() {
        (function () {
            compound.controllerExtensions.render.call(controller, 'missing');
        }).should.throw('Template controller/missing not found');
    });

});
