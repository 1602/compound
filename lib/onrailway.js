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
 * @see /1602/kontroller
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
function Railway(app) {
    this.app = app;
    this.root = app.root;
    this.utils       = require('./railway_utils');
    this.ControllerBridge = require('./controller-bridge');
    this.controller  = require('kontroller').BaseController;

    this.structure   = require('./structure')(this);
    this.locales     = require('./locales')(this);
    this.controllerBridge = new this.ControllerBridge(this.root);
    this.extensions  = require('./extensions')(this);
    this.generators  = require('./generators')(this);
    this.tools       = require('./tools')(this);
    this.logger      = require('./logger')(this);
    this.routeMapper = new Map(app, this.controllerBridge.uniCaller.bind(this.controllerBridge));
    this.helpers     = require('./helpers')(this);
    this.models      = require('./models')(this);
}

Railway.prototype.version = require('../package').version;

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
    app.root = app.root || process.cwd();

    // create API publishing object
    var railway = new Railway(app);

    // run environment.{js|coffee} and environments/{test|development|production}.{js|coffee}
    configureApp(railway);

    // controllers should be loaded before extensions
    // railway.controller.init(root);

    // extensions should be loaded before server startup
    railway.extensions.init();

    // init models in app/models/*
    railway.models.init();

    // run config/initializers/*
    runInitializers(root);

    if (existsSync(root + '/config') && (existsSync(root + '/config/routes.js') || existsSync(root + '/config/routes.coffee'))) {
        railway.routeMapper.addRoutes(root + '/config/routes', cb.uniCaller.bind(cb));
    }

    // everything else can be done after starting server
    process.nextTick(function () {

        railway.locales();
        railway.logger();

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

