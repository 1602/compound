var fs = require('fs');
var path = require('path');
var exts = require('./controller-extensions');
var pool = {};
var cache = {};

var ctlSuffix = /_controller\.(js|coffee)/g;

module.exports = ControllerBrigde;

function ControllerBrigde(root) {
    this.root = root || app.root + '/app/controllers';
};

ControllerBrigde.config = {
    subdomain: {
        tld: 2
    }
};

ControllerBrigde.poolSize = function () {
    Object.keys(pool).forEach(function (i) {
        console.log(i, pool[i].length);
    });
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
            // app.reloadModels(this.root + '/app/models/');
        }
        ctl.perform(action || req.params.action, req, res, function (err) {
            ctl._backToPool();
            if (err) next(err);
        });
    }.bind(this);
};

ControllerBrigde.prototype.loadController = function (controllerFullName) {
    var file = this.root + '/' + controllerFullName + '_controller.js';
    if (!pool[file]) {
        pool[file] = [];
    }
    if (pool[file].length) {
        return pool[file].shift();
    }
    var ctl = this.getInstance(file, exts);
    ctl._backToPool = function () {
        pool[file].push(ctl);
    };
    return ctl;
};

ControllerBrigde.prototype.getInstance = function getInstance(filename, exts) {
    var controllerName = filename.split('/').pop().replace(ctlSuffix, '');
    var root = path.dirname(filename);

    var code = cache[filename];
    if (!code) {
        cache[filename] = fs.readFileSync(filename).toString();
        return getInstance(filename, exts);
    }

    // create blank controller
    var Controller = railway.controller.constructClass(controllerName);
    Controller.root = root;

    // add controller extensions
    if (exts) {
        Object.keys(exts).forEach(function (k) {
            Controller.prototype[k] = exts[k];
        });
    }

    // instantiate
    var ctl = new Controller;
    ctl.reset();

    // and run through configurator code
    // (it happens only once to describe actions, request handling flow, etc)
    ctl.build(code);

    return ctl;
};

