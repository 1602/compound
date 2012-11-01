var fs = require('fs');
var path = require('path');
var exts = require('./controller-extensions');
var pool = {};
var cache = {};
var utils = require('./railway_utils');
var $ = utils.stylize.$;
var log = utils.debug;

var ctlSuffix = /_controller\.(js|coffee)/g;

module.exports = ControllerBrigde;

function ControllerBrigde(rw) {
    this.railway = rw;
    this.root = rw.root + '/app/controllers';
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
    var app = this.railway.app;

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

ControllerBrigde.prototype.loadController = function (controllerFullName) {
    if (!this.railway.app.enabled('watch')) {
        if (!pool[controllerFullName]) {
            pool[controllerFullName] = [];
        }
        if (pool[controllerFullName].length) {
            return pool[controllerFullName].shift();
        }
        var ctl = this.getInstance(controllerFullName, exts);
        ctl._backToPool = function () {
            pool[controllerFullName].push(ctl);
        };
        return ctl;
    } else {
        return this.getInstance(controllerFullName, exts);
    }
};

ControllerBrigde.prototype.getInstance = function getInstance(name, exts) {
    var railway = this.railway;
    var app = railway.app;

    var code = railway.structure.controllers[name + '_controller'];

    // create blank controller
    var Controller = railway.controller.constructClass(name);

    // add controller extensions
    if (exts) {
        Object.keys(exts).forEach(function (k) {
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
    ctl.build(code, railway.rootModule);

    if (!railway.app.settings.quiet) {
        var logger = ctl.getLogger();
        logger.on('beforeProcessing', function (ctl) {
            var req = ctl.context.req;

            log(
                '\n' + $((new Date).toString()).yellow + ' ' + $(ctl.id || '').bold +
                '\n' +
                $(req.method).bold + ' ' + $(req.url).grey +
                ' controller: ' + $(ctl.controllerName).cyan +
                ' action: ' + $(ctl.actionName).blue
            );
            if (req.query && Object.keys(req.query).length) {
                log($('Query: ').bold + JSON.stringify(req.query));
            }
            if (req.body && req.method !== 'GET') {
                var filteredBody = {};
                Object.keys(req.body).forEach(function (param) {
                    if (!(ctl.constructor.filterParams || []).some(function (filter) {return param.search(filter) !== -1;})) {
                        filteredBody[param] = req.body[param];
                    } else {
                        filteredBody[param] = '[FILTERED]';
                    }
                });
                log($('Body:  ').bold + JSON.stringify(filteredBody));
            }
        });
        logger.on('afterProcessing', function (ctl, duration) {
            var req = ctl.context.req;
            log('Handling ' + $(req.method).bold + ' ' + $(req.url).grey +
            ' completed in ' + duration + ' ms');
        });
        logger.on('beforeHook', function (ctl, action) {
            if (ctl.context.inAction) {
                log('>>> perform ' + $(action).bold.cyan);
            } else {
                log('>>> perform ' + $(action).bold.grey);
            }
        });
        logger.on('afterHook', function (ctl, action, duration) {
            log('<<< ' + action + ' [' + duration + ' ms]');
        });
    }

    return ctl;
};

