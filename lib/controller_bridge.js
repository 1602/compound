var ControllerBrigde = {};

ControllerBrigde.uniCaller = function (ns, controller, action) {
    return function (req, res) {
        var ctl = ControllerBrigde.loadController(ns + (controller || req.params.controller));
        if (app.disabled('model cache')) {
            app.reloadModels();
        }
        ctl.perform(action || req.params.action, req, res);
    };
};

ControllerBrigde.loadController = function (controller) {
    return railway.controller.load(controller);
};

module.exports = ControllerBrigde;

