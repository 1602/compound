var ControllerBrigde = {
    config: {
        subdomain: {
            tld: 2
        }
    }
};

ControllerBrigde.uniCaller = function (ns, controller, action, params) {
    return function (req, res, next) {

        var subdomain = req.headers.host
            .split('.')
            .slice(0, -1 * ControllerBrigde.config.subdomain.tld)
        req.subdomain = subdomain.join('.');

        if (params && params.subdomain) {
            if (params.subdomain !== req.subdomain) {
                if (params.subdomain.match(/\*/)) {
                    var matched = true;
                    params.subdomain.split('.').forEach(function (part, i) {
                        if (part === '*') return;
                        if (part !== subdomain[i]) matched = false;
                    });

                    if (!matched) return next(); // next route
                } else return next();
            }
        }

        var ctl = ControllerBrigde.loadController(ns + (controller || req.params.controller));
        if (app.disabled('model cache')) {
            // TODO: reloadModels should work without any params
            // it just should remember all paths
            // called previously with
            app.reloadModels(app.root + '/app/models/');
        }
        ctl.perform(action || req.params.action, req, res, next);
    };
};

ControllerBrigde.loadController = function (controller) {
    return railway.controller.load(controller);
};

module.exports = ControllerBrigde;

