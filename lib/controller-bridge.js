var fs = require('fs');
var path = require('path');
var pool = {};
var cache = {};
var utils = require('./railway_utils');
var $ = utils.stylize.$;
var log = utils.debug;

var ctlSuffix = /_controller\.(js|coffee)/g;

/**
 * @export ControllerBridge
 */
module.exports = ControllerBrigde;

/**
 * Bridge to kontroller package
 *
 * @param {Railway} rw - railway descriptor.
 * @constructor
 */
function ControllerBrigde(rw) {
    this.railway = rw;
    this.root = rw.root + '/app/controllers';
}

/**
 * Bridge config
 *
 * @deprecated Should be removed to instance.
 */
ControllerBrigde.config = {
    subdomain: {
        tld: 2
    }
};

/**
 * Prints information about current pool size
 */
ControllerBrigde.poolSize = function() {
    Object.keys(pool).forEach(function(i) {
        console.log(i, pool[i].length);
    });
};

/**
 * Caller for request handler
 *
 * @param {String} ns - namespace.
 * @param {String} controller - name of controller.
 * @param {String} action - name of action.
 * @param {Object} conf - optional params (comes from route definition).
 *
 * TODO: remove NS param, move subdomain logic to railway-routes
 *
 * @return {Function(req, res, next)} request handler.
 */
ControllerBrigde.prototype.uniCaller = function(ns, controller, action, conf) {
    var app = this.railway.app;

    return function(req, res, next) {

        var subdomain = req.headers && req.headers.host && req.headers.host
            .split('.')
            .slice(0, -1 * ControllerBrigde.config.subdomain.tld);
        req.subdomain = subdomain && subdomain.join('.');

        if (conf && conf.subdomain && req.subdomain) {
            if (conf.subdomain !== req.subdomain) {
                if (conf.subdomain.match(/\*/)) {
                    var matched = true;
                    conf.subdomain.split('.').forEach(function(part, i) {
                        if (part === '*') return;
                        if (part !== subdomain[i]) matched = false;
                    });

                    if (!matched) return next(); // next route
                } else return next();
            }
        }

        var controllerName = ns + (controller || req.params.controller);
        var ctl = this.loadController(controllerName);
        if (app.disabled('model cache')) {
            // TODO: reloadModels should work without any params
            // it just should remember all paths
            // called previously with
            // app.reloadModels(this.root + '/app/models/');
        }
        ctl.perform(action || req.params.action, req, res, function(err) {
            // console.log((new Error).stack);
            if (ctl._backToPool) {
                ctl._backToPool();
            } else {
                ctl = null;
            }
            if (err) next(err);
        });
    }.bind(this);
};

/**
 * Load controller (from pool, or create new)
 *
 * @param {String} controllerFullName - name of controller including namespace.
 * @return {Controller} - controller instance.
 */
ControllerBrigde.prototype.loadController = function(controllerFullName) {
    if (!this.railway.app.enabled('watch')) {
        if (!pool[controllerFullName]) {
            pool[controllerFullName] = [];
        }
        if (pool[controllerFullName].length) {
            return pool[controllerFullName].shift();
        }
        var ctl = this.getInstance(controllerFullName);
        ctl._backToPool = function() {
            pool[controllerFullName].push(ctl);
        };
        return ctl;
    } else {
        return this.getInstance(controllerFullName);
    }
};

/**
 * Create new instance of controller
 *
 * @param {String} name - name of controller.
 * @return {Controller} - instance of controller.
 */
ControllerBrigde.prototype.getInstance = function getInstance(name) {
    var railway = this.railway;
    var app = railway.app;
    var exts = this.railway.controllerExtensions;

    var code = railway.structure.controllers[name + '_controller'];

    // create blank controller
    var Controller = railway.controller.constructClass(name);

    // add controller extensions
    if (exts) {
        Object.keys(exts).forEach(function(k) {
            Controller.prototype[k] = exts[k];
        });
    }

    Controller.prototype.railway = railway;
    Controller.prototype.app = app;
    Controller.prototype.pathTo = railway.routeMapper.pathTo;
    Controller.prototype.path_to = railway.routeMapper.pathTo;

    // add models
    for (var m in this.railway.models) {
        Controller.prototype[m] = railway.models[m];
    }

    // instantiate
    var ctl = new Controller;
    ctl.reset();

    // and run through configurator code
    // TODO: pass patched railway.rootModule for more accurate require('./...')
    ctl.build(code, {
        id: railway.rootModule.filename,
        filename: railway.rootModule.filename,
        paths: [railway.root + '/node_modules']
    });

    if (!railway.app.settings.quiet) {
        var logger = ctl.getLogger();
        logger.on('beforeProcessing', function(ctl) {
            var req = ctl.context.req;

            log(
                '\n' + $((new Date).toString()).yellow + ' ' +
                $(ctl.id || '').bold +
                '\n' +
                $(req.method).bold + ' ' + $(req.url).grey +
                ' controller: ' + $(ctl.controllerName).cyan +
                ' action: ' + $(ctl.actionName).blue
            );
            if (req.query && Object.keys(req.query).length) {
                log($('Query:  ').bold + JSON.stringify(req.query));
            }
            if (req.body && req.method !== 'GET') {
                var filteredBody = {};
                Object.keys(req.body).forEach(function(param) {
                    if (!(ctl.constructor.filterParams || []).some(function(f) {
                        return param.search(f) !== -1;
                    })) {
                        filteredBody[param] = req.body[param];
                    } else {
                        filteredBody[param] = '[FILTERED]';
                    }
                });
                log($('Body:   ').bold + JSON.stringify(filteredBody));
            }
            if (req.params && Object.keys(req.params).length) {
                var filteredParams = {};
                Object.keys(req.params).forEach(function (param) {
                    filteredParams[param] = req.params[param];
                });
                log($('Params: ').bold + JSON.stringify(filteredParams));
            }
        });
        logger.on('afterProcessing', function(ctl, duration) {
            var req = ctl.context.req;
            log('Handling ' + $(req.method).bold + ' ' + $(req.url).grey +
            ' completed in ' + duration + ' ms');
        });
        logger.on('beforeHook', function(ctl, action) {
            if (ctl.context.inAction) {
                log('>>> perform ' + $(action).bold.cyan);
            } else {
                log('>>> perform ' + $(action).bold.grey);
            }
        });
        logger.on('afterHook', function(ctl, action, duration) {
            log('<<< ' + action + ' [' + duration + ' ms]');
        });
    }

    return ctl;
};

