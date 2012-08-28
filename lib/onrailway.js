var fs = require('fs');
var path = require('path');
var singularize = require("../vendor/inflection").singularize;
var utils = require('./railway_utils');
var safe_merge = utils.safe_merge;
var Map = require('railway-routes').Map;
var existsSync = fs.existsSync || path.existsSync;
var exists = fs.exists || path.exists;
require('coffee-script');

/**
 * Global railway API singleton.
 * Available everywhere in project.
 *
 * @member railway.locales - localization module
 * @member railway.utils - railway utilities (stylize, runCode, etc..)
 * @see railway_utils.html#
 * @member railway.controller
 * @see controller.html#
 * @member railway.extensions
 * @see extensions.html#
 * @member railway.generators
 * @see generators.html#
 * @member railway.tools
 * @see tools.html#
 * @member railway.logger
 * @see logger.html#
 * @member railway.helpers
 * @see helpers.html#
 * @member railway.models
 * @see model.html#
 */
function Railway() {

    if (global.hasOwnProperty('railway')) return railway;

    global.railway = this;

    this.locales     = require('./locales');
    this.utils       = require('./railway_utils');

    this.ControllerBridge = require('./controller_bridge');
    this.controllerBridge = new this.ControllerBridge;

    this.controller  = require('./controller');
    this.extensions  = require('./extensions');
    this.generators  = require('./generators');
    this.tools       = require('./tools');
    this.logger      = require('./logger');
    this.routeMapper = new Map(app, this.controllerBridge.uniCaller.bind(this.controllerBridge));
    this.helpers     = require('./helpers');

    this.models      = require('./models');
}

try {
    if (process.versions.node < '0.6') {
        Railway.prototype.version = JSON.parse(fs.readFileSync(__dirname + '/../package.json')).version;
    } else {
        Railway.prototype.version = require('../package').version;
    }
} catch(e) {
}

/**
 * Initialize railway application:
 *
 *  - load modules
 *  - run configurators (config/environment, config/environments/{env})
 *  - init controllers
 *  - init extensions (including ORM and db/schema)
 *  - init models
 *  - run initializers `config/initializers/*`
 *  - add routes
 *  - start http server
 *  - locales
 *  - loggers
 *  - observers
 *  - assets
 *
 */
exports.init = function initRailway(app) {
    var isMainModule = !global.hasOwnProperty('app');
    // globalize app object
    if (isMainModule) {
        global.app = app;
        app.root = process.cwd();
        app.models = {};
    }

    var root;
    if (typeof app === 'string') {
        root = app;
        if (!isMainModule) {
            var cb = new railway.ControllerBridge(root);
        }
    } else {
        root = app.root;
    }

    // create API publishing object
    new Railway();

    // run environment.{js|coffee} and environments/{test|development|production}.{js|coffee}
    configureApp(root, isMainModule);

    // controllers should be loaded before extensions
    railway.controller.init(root);

    // extensions should be loaded before server startup
    railway.extensions.init(root);

    // init models in app/models/*
    railway.models.init(root);

    // run config/initializers/*
    runInitializers(root);

    if (existsSync(root + '/config') && (existsSync(root + '/config/routes.js') || existsSync(root + '/config/routes.coffee'))) {
        railway.routeMapper.addRoutes(root + '/config/routes', isMainModule ? null : cb.uniCaller.bind(cb));
    }

    // everything else can be done after starting server
    process.nextTick(function () {

        railway.locales.init(root);
        railway.logger.init(app.root);
        app.reloadModels = railway.models.loadModels;

        loadObservers();

        if (global.app.enabled('merge javascripts')) {
            ensureDirClean(app.root + '/public' + app.set('jsDirectory'), 'cache');
        }

        if (global.app.enabled('merge stylesheets')) {
            ensureDirClean(app.root + '/public' + app.set('cssDirectory'), 'cache');
        }

    });
};

/**
 * Create http server object. Automatically hook up SSL keys stored in
 * app.root/config/tsl.{cert|key}
 *
 * @param {Object} options: {key: 'path/to/tsl.key', cert: 'path/to/tsl.cert'}
 */
exports.createServer = function (options) {
    options = options || {};
    var express = require('express');
    var server;
    if (express.createServer) {
        server = express.createServer;
    } else {
        server = express;
    }

    var keys, app,
        key = options.key || process.cwd() + '/config/tsl.key',
        cert = options.cert || process.cwd() + '/config/tsl.cert';

    if (existsSync(key) && existsSync(cert)) {
        keys = {
            key: fs.readFileSync(key).toString('utf8'),
            cert: fs.readFileSync(cert).toString('utf8')
        };
    }

    if (keys) {
        app = server(keys);
    } else {
        app = server();
    }

    exports.init(app);

    return app;
};

/**
 * Run app configutators in `config/environment` and `config/environments/{env}`.
 * Also try to monkey patch ejs and jade. **weird**
 */
function configureApp(root, isMainModule) {
    var mainEnv = root + '/config/environment';
    if (isMainModule) {
        app.set('views', root + '/app/views');
        requireIfExists(mainEnv + '.js') || requireIfExists(mainEnv + '.coffee');
    }
    var supportEnv = app.root + '/config/environments/' + app.settings.env;
    requireIfExists(supportEnv + '.js') || requireIfExists(supportEnv + '.coffee');

    if (!isMainModule) {
        return;
    }

    // TODO: remove monkey-patching from here

    if (app.settings['view engine'] == 'ejs' && (!app.extensions || !app.extensions['ejs-ext'])) {
        // monkey patch ejs
        try {
            var ejs = require('ejs'), old_parse = ejs.parse;
            ejs.parse = function () {
                var str = old_parse.apply(this, Array.prototype.slice.call(arguments));
                return str.replace('var buf = [];', 'var buf = []; arguments.callee.buf = buf;');
            };
        } catch (e) {}
    }

    if (app.settings['view engine'] == 'jade' && (!app.extensions || !app.extensions['jade-ext'])) {
        // monkey patch jade
        try {
            var jade = require('jade'), old_parse = jade.Compiler.prototype.compile;
            jade.Compiler.prototype.compile = function () {
                var str = old_parse.apply(this, Array.prototype.slice.call(arguments));
                // console.log(str);
                return 'arguments.callee.buf = buf;' + str;
            };
        } catch (e) {}
    }

}

/**
 * Require `module` if it exists
 *
 * @param {String} module - path to file
 */
function requireIfExists(module) {
    if (railway.utils.existsSync(module)) {
        require(module);
        return true;
    } else {
        return false;
    }
}

/**
 * Run initializers in sandbox mode
 */
function runInitializers(root) {

    var context = {global: {}};

    for (var i in app.models) {
        context[i] = app.models[i];
    }

    var initializersPath = root + '/config/initializers/';
    if (existsSync(initializersPath)) {
        fs.readdirSync(initializersPath).forEach(function (file) {
            if (file.match(/^\./)) return;
            var script_name = initializersPath + file;
            utils.runCode(script_name, context);
        });
        for (var i in context.global) {
            global[i] = context.global[i];
        }
    }
}

/**
 * Observer is a kind of controller, that listen for some event in 
 * the system, for example: paypal, twitter or facebook observers 
 * listens for callback from foreign service. Email observer may 
 * listen some events related to emails.
 * 
 * If you need app.on('someEvent') you should place this code in
 * APPROOT/app/observers/NAME_observer.js
 */
function loadObservers() {
    var dir = app.root + '/app/observers';
    exists(dir, function (exists) {
        if (exists) {
            fs.readdir(dir, function (err, files) {
                if (!err && files) {
                    files.forEach(function (file) {
                        if (file.match(/^[^\.]/)) {
                            require(path.join(dir, file));
                        }
                    });
                }
            });
        }
    });
}

/**
 * Cleanup or create dir
 */
function ensureDirClean(dir, prefix) {
    exists(dir, function (exists) {
        if (exists) {
            fs.readdir(dir, function (err, files) {
                files.filter(function (file) {
                    return file.indexOf(prefix + '_') === 0;
                }).map(function (file) {
                    return path.join(dir, file);
                }).forEach(fs.unlink);
            });
        } else {
            fs.mkdir(dir, 0755);
        }
    });
}

