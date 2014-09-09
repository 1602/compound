var fs = require('fs');
var path = require('path');
var cache = {};

var ctlSuffix = /_controller\.(js|coffee)/g;

var debug = function(){};

/**
 * @export ControllerBridge
 */
module.exports = ControllerBridge;

/**
 * Bridge to kontroller package
 *
 * @param {Compound} rw - compound descriptor.
 * @constructor
 */
function ControllerBridge(rw) {
    this.compound = rw;
    this.root = rw.root + '/app/controllers';
    this.pool = {};

    if (process.env.NODE_DEBUG && /controller/.test(process.env.NODE_DEBUG)) {
        debug = function(x) {
            rw.log(x);
        };
    }

}

/**
 * Bridge config
 *
 * @deprecated Should be removed to instance.
 */
ControllerBridge.config = {
    subdomain: {
        tld: 2
    }
};

/**
 * Prints information about current pool size
 */
ControllerBridge.prototype.poolSize = function() {
    var bridge = this;
    Object.keys(bridge.pool).forEach(function(i) {
        console.log(i, bridge.pool[i].length);
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
 * TODO: remove NS param, move subdomain logic to compound-routes
 *
 * @return {Function(req, res, next)} request handler.
 */
ControllerBridge.prototype.uniCaller = function(ns, controller, action, conf) {
    var app = this.compound.app;

    return function(req, res, next) {

        // Request hostname, or null if unknown
        var hostname =
            (req.headers && req.headers.host && req.headers.host.length)
                ? req.headers.host.toLowerCase()
                : null;

        var subdomain = req.headers && req.headers.host &&
            req.headers.host
                .split('.')
                .slice(0, -1 * ControllerBridge.config.subdomain.tld);

        req.subdomain = subdomain && subdomain.join('.');

        // Virtual Host match?
        if (conf && conf.vhost && conf.vhost.length && hostname) {

            // Virtual host is a wildcard?
            var wildcard = (conf.vhost.charAt(0) === '.');

            // Virtual host name (without leading wildcard character, if any)
            var vhost =
                (wildcard)
                    ? conf.vhost.substring(1).toLowerCase()
                    : conf.vhost.toLowerCase();

            // Compare without regard to port number if the configuration vhost
            // does not specify a port number. This lets us work with a proxy-
            // server with little complication.
            if (vhost.indexOf(":") < 0) {
                // Strip port number from the request hostname
                var portIndex = hostname.indexOf(":");
                if (portIndex >= 0) {
                    hostname = hostname.substring(0, portIndex);
                }
            }

            // Does the request match the Virtual Host?
            var match;

            // Wildcard virtual host: ".example.com" (12 chars) should match:
            //  1. "www.example.com" (15 chars)
            //  2.     "example.com" (11 chars)
            if (wildcard) {
                // Condition #1 above
                match =
                    (hostname.length > vhost.length) &&
                    (hostname.indexOf("." + vhost) === (hostname.length - conf.vhost.length));

                // Condition #2 above
                match = match || (vhost === hostname);
            }
            // Virtual Host exact match
            else {
                match = (vhost === hostname);
            }

            if (!match) {
                // Virtual Host mismatch: go to the next route
                return next();
            }
        }
        // Subdomain match?
        else if (conf && conf.subdomain && req.subdomain) {
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

        this.callControllerAction(controllerName, action || req.params.action, req, res, next);
    }.bind(this);
};

ControllerBridge.prototype.callControllerAction = function (controller, action, req, res, next) {
    debug('call controller ' + controller + ' action ' + action);
    var ctl = this.loadController(controller);

    var resEnd = res.end;
    var endCalled = false;
    res.end = function () {
        endCalled = true;
        resEnd.apply(res, [].slice.call(arguments));
    };
    // TODO: move all before-processing calls to separate method
    if (ctl && ctl._helpers) {
        delete ctl._helpers;
    }
    this.compound.emit('before controller', ctl, action, res, res, next);
    debug('perform ' + controller + '#' + action);
    ctl.perform(action, req, res, function(err) {
        debug(controller + '#' + action + ' completed');
        // console.log((new Error).stack);
        if (ctl && ctl._backToPool) {
            ctl._backToPool();
        } else {
            ctl = null;
        }
        if (err) {
            next(err);
        } else if (!endCalled) {
            next();
        }
    });
}

/**
 * Load controller (from pool, or create new)
 *
 * @param {String} controllerFullName - name of controller including namespace.
 * @return {Controller} - controller instance.
 */
ControllerBridge.prototype.loadController = function(controllerFullName) {
    if (this.compound.app.enabled('watch')) {
        return this.getInstance(controllerFullName);
    }
    var pool = this.pool;
    if (!pool[controllerFullName]) {
        pool[controllerFullName] = [];
    }
    if (pool[controllerFullName].length) {
        debug('found controller ' + controllerFullName + ' from pool');
        return pool[controllerFullName].shift();
    }
    debug('creating new controller');
    var ctl = this.getInstance(controllerFullName);
    ctl._backToPool = function() {
        debug('return controller ' + controllerFullName + ' to pool');
        pool[controllerFullName].push(ctl);
    };
    return ctl;
};

/**
 * Create new instance of controller
 *
 * @param {String} name - name of controller.
 * @return {Controller} - instance of controller.
 */
ControllerBridge.prototype.getInstance = function getInstance(name) {
    var compound = this.compound;
    var app = compound.app;
    var exts = this.compound.controllerExtensions;
    var controllers = compound.structure.controllers;

    var Controller, buildFromEval;
    if (name in controllers && !name.match(/_controller$/)) {
        Controller = compound.controller.constructClass(name, controllers[name]);
        Controller.skipLogging = controllers[name].skipLogging;
    } else {
        Controller = compound.controller.constructClass(name);
        buildFromEval = controllers[name + '_controller'];
    }

    // add controller extensions
    if (exts) {
        Object.keys(exts).forEach(function(k) {
            Controller.prototype[k] = exts[k];
        });
    }

    Controller.prototype.compound = compound;
    Controller.prototype.app = app;
    Controller.prototype.pathTo = compound.map.pathTo;
    // TODO: deprecate path_to
    Controller.prototype.path_to = compound.map.pathTo;

    // add models
    for (var m in this.compound.models) {
        Controller.prototype[m] = compound.models[m];
    }

    // instantiate
    var ctl = new Controller;
    if (buildFromEval) {
        ctl.reset();

        // and run through configurator code
        // TODO: pass patched compound.rootModule for more accurate require('./...')
        ctl.build(buildFromEval, {
            id: compound.rootModule.filename,
            filename: compound.rootModule.filename,
            paths: [path.join(compound.root, 'node_modules')]
        });
    }

    compound.emit('controller instance', ctl);

    if (compound.app.disabled('quiet') || compound.app.get('quiet') === 'all') {
        var $ = compound.utils.stylize.$;
        var log = compound.utils.debug;
        var skipLogging = ctl.constructor.skipLogging;
        var logger = ctl.getLogger();
        logger.on('beforeProcessing', function(ctl) {
            if (skipLogging && skipLogging.indexOf(ctl.actionName) > -1) {
                return;
            }
            var req = ctl.context.req;

            log(
                '\n' + $((new Date).toString()).yellow + ' ' +
                $(ctl.id || '').bold +
                '\n' +
                $(req.method).bold + ' ' +
                $(req.app && req.app.path()).blue +
                $(req.url).grey +
                ' controller: ' + $(ctl.controllerName).cyan +
                ' action: ' + $(ctl.actionName).blue
            );
            if (req.query && Object.keys(req.query).length) {
                log($('Query:  ').bold + JSON.stringify(req.query));
            }
            if (req.body && req.method !== 'GET') {
                var filterParams = ctl.constructor.filterParams || [];
                var filteredBody = (function filter(obj) {
                    if (typeof obj !== 'object' || obj == null) {
                        return obj;
                    }
                    var filtered = {};
                    Object.keys(obj).forEach(function(param) {
                        if (!filterParams.some(function(f) {
                            return param.search(f) !== -1;
                        })) {
                            filtered[param] = filter(obj[param]);
                        } else {
                            filtered[param] = '[FILTERED]';
                        }
                    });
                    return filtered;
                })(req.body);
                log($('Body:   ').bold + JSON.stringify(filteredBody));
            }
            if (req.params && typeof req.params === 'object' &&
            Object.keys(req.params).length) {
                var filteredParams = {};
                Object.keys(req.params).forEach(function (param) {
                    filteredParams[param] = req.params[param];
                });
                log($('Params: ').bold + JSON.stringify(filteredParams));
            }
        });
        logger.on('afterProcessing', function(ctl, duration) {
            if (skipLogging && skipLogging.indexOf(ctl.actionName) > -1) {
                return;
            }
            var req = ctl.context.req;
            log('Handling ' + $(req.method).bold + ' ' + $(req.url).grey +
            ' completed in ' + duration + ' ms');
        });
        logger.on('beforeHook', function(ctl, action) {
            if (skipLogging && skipLogging.indexOf(ctl.actionName) > -1) {
                return;
            }
            if (ctl.context.inAction) {
                log('>>> perform ' + $(action).bold.cyan);
            } else {
                log('>>> perform ' + $(action).bold.grey);
            }
        });
        logger.on('afterHook', function(ctl, action, duration) {
            if (skipLogging && skipLogging.indexOf(ctl.actionName) > -1) {
                return;
            }
            log('<<< ' + action + ' [' + duration + ' ms]');
        });
        logger.on('render', function(file, layout, duration) {
            if (skipLogging && skipLogging.indexOf(ctl.actionName) > -1) {
                return;
            }
            log('Rendered ' + $(file).grey + ' using layout ' + $(layout).grey +
            ' in ' + duration + 'ms');
        });
    }

    return ctl;
};
