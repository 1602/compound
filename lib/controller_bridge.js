var exts = require('./controller-extensions');

module.exports = ControllerBrigde;

function ControllerBrigde(root) {
    this.root = root || app.root + '/app/controllers';
};

ControllerBrigde.config = {
    subdomain: {
        tld: 2
    }
};

// TODO: remove NS param, move subdomain logic to railway-routes
ControllerBrigde.prototype.uniCaller = function (ns, controller, action, params) {
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

        var ctl = this.loadController(ns + (controller || req.params.controller));
        if (app.disabled('model cache')) {
            // TODO: reloadModels should work without any params
            // it just should remember all paths
            // called previously with
            app.reloadModels(this.root + '/app/models/');
        }
        ctl.perform(action || req.params.action, req, res, next);
    }.bind(this);
};

ControllerBrigde.prototype.loadController = function (controllerFullName) {
    return railway.controller.getInstance(this.root + '/' + controllerFullName + '_controller.js', exts);
};

