var fs = require('fs');
var path = require('path');
var singularize = require('../vendor/inflection').singularize;
var utils = require('./railway_utils');
var safe_merge = utils.safe_merge;
var Map = require('railway-routes').Map;
var existsSync = fs.existsSync || path.existsSync;
var exists = fs.exists || path.exists;
var cs = require('coffee-script');
var Module = require('module').Module;

/**
 * Global railway API singleton.
 * Available everywhere in project.
 *
 * @constructor
 * @see railway_utils.html#
 * @see /1602/kontroller
 * @see extensions.html#
 * @see generators.html#
 * @see tools.html#
 * @see logger.html#
 * @see helpers.html#
 * @see model.html#
 */
function Railway(app) {
    app.railway = this;
    this.__defineGetter__('rootModule', function() {
        return module.parent;
    });
    this.app = app;
    this.root = app.root;
    this.utils = utils;
    this.logger = require('./logger');
    this.logger.init(this);
    this.ControllerBridge = require('./controller-bridge');
    this.controller = require('kontroller').BaseController;

    this.structure = require('./structure')(this);
    this.locales = require('./locales')(this);
    var bridge = this.controllerBridge = new this.ControllerBridge(this);
    this.extensions = require('./extensions');
    this.generators = require('./generators');
    this.tools = require('./tools');
    this.routeMapper = new Map(app, bridge.uniCaller.bind(bridge));
    this.helpers = require('./helpers');
    this.models = {};
    this.controllerExtensions = {};
}

/**
 * Grab railway version from package.json
 */
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
 * @param {Object} app - express server, may contain optional `root` member.
 * @return {Railway} railway - railway app descriptor.
 */
exports.init = function initRailway(app) {
    app.root = app.root || process.cwd();

    // create API publishing object
    var railway = new Railway(app);

    // run environment.{js|coffee}
    // and environments/{test|development|production}.{js|coffee}
    configureApp(railway);

    // controllers should be loaded before extensions
    // railway.controller.init(root);

    // extensions should be loaded before server startup
    railway.extensions();

    if (existsSync(app.root + '/config') &&
        (existsSync(app.root + '/config/routes.js') ||
        existsSync(app.root + '/config/routes.coffee'))) {
            railway.routeMapper.addRoutes(app.root + '/config/routes',
            railway.controllerBridge.uniCaller.bind(railway.controllerBridge));
    }

    // everything else can be done after starting server
    process.nextTick(function() {
        railway.structure = railway.structure();

        var exts = require('./controller-extensions');
        for (var i in exts) {
            railway.controllerExtensions[i] = exts[i];
        }

        // init models in app/models/*
        require('./models').init(railway);

        // run config/initializers/*
        runInitializers(railway);

        railway.locales();

        if (railway.app.enabled('merge javascripts')) {
            ensureDirClean(railway.app.root + '/public' +
                railway.app.set('jsDirectory'), 'cache');
        }

        if (railway.app.enabled('merge stylesheets')) {
            ensureDirClean(railway.app.root + '/public' +
                railway.app.set('cssDirectory'), 'cache');
        }

    });

    return railway;
};

/**
 * Create http server object. Automatically hook up SSL keys stored in
 * app.root/config/tsl.{cert|key}
 *
 * @param {Object} options - example:
 *   {root: __dirname, key: 'path/to/tsl.key', cert: 'path/to/tsl.cert'}.
 * @return {Function} express server.
 */
exports.createServer = function(options) {
    options = options || {};
    if (typeof options === 'string') {
        options = {root: options};
    }
    var express = require('express');
    var server;
    if (typeof express === 'function') {
        server = express;
    } else {
        server = express.createServer;
    }

    var keys, app, root = options.root || process.cwd(),
        key = options.key || root + '/config/tsl.key',
        cert = options.cert || root + '/config/tsl.cert';

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
    app.root = root;

    var rw = exports.init(app);
    app.express2 = !!express.version.match(/^2/);
    app.express3 = !!express.version.match(/^3/);

    return app;
};

/**
 * Run app configutators in `config/environment` and `config/environments/env`.
 * Also try to monkey patch ejs and jade. **weird**
 * @param {Railway} railway - railway app descriptor.
 */
function configureApp(railway) {
    var app = railway.app;
    var root = railway.root;
    var mainEnv = root + '/config/environment';

    console.log(mainEnv);

    app.set('views', root + '/app/views');
    requireIfExists(app, mainEnv + '.js') ||
    requireIfExists(app, mainEnv + '.coffee');

    var supportEnv = app.root + '/config/environments/' + app.settings.env;
    requireIfExists(app, supportEnv + '.js') ||
    requireIfExists(app, supportEnv + '.coffee');

}

/**
 * Require `module` if it exists
 *
 * @param {Object} app - express app.
 * @param {String} module - path to file.
 * @return {Boolean} success - returns true when required file exists.
 */
function requireIfExists(app, module) {
    if (utils.existsSync(module)) {
        evalInContextOf(app, module);
        return true;
    } else {
        return false;
    }
}

function evalInContextOf(app, filename) {
    var code = fs.readFileSync(filename).toString();
    if (filename.match(/\.coffee/)) {
        code = cs.compile(code);
    }
    var fn = new Function('app', 'railway', '__dirname', '__filename',
        'require', code);
    fn.call(null, app, app.railway, path.dirname(filename), filename,
        function(path) {
            return Module._load(path, {
                id: filename,
                filename: filename,
                paths: [app.root + '/node_modules']
            });
    });
}

/**
 * Run initializers in sandbox mode
 * @param {Railway} rw - railway descriptor.
 */
function runInitializers(rw) {

    var context = {};

    for (var i in rw.models) {
        context[i] = rw.models[i];
    }

    var initializersPath = root + '/config/initializers/';
    if (existsSync(initializersPath)) {
        fs.readdirSync(initializersPath).forEach(function(file) {
            if (file.match(/^\./)) return;
            var filename = initializersPath + file;
            var code = fs.readFileSync(filename).toString();
            if (filename.match(/\.coffee/)) {
                code = cs.compile(code);
            }
            var fn = new Function(
                'context', '__filename', '__dirname', 'require',
                'with (context) { (function () { ' + code + ' })() }'
            );
            fn(context, filename, path.dirname(filename), function(path) {
                return Module._load(path, {
                    id: filename,
                    filename: filename,
                    paths: [app.root + '/node_modules']
                });
            });
        });
    }
}

/**
 * Cleanup or create dir
 *
 * @param {String} dir - path to dir to create.
 * @param {String} prefix - only remove files started with that prefix.
 */
function ensureDirClean(dir, prefix) {
    exists(dir, function(exists) {
        if (exists) {
            fs.readdir(dir, function(err, files) {
                files.filter(function(file) {
                    return file.indexOf(prefix + '_') === 0;
                }).map(function(file) {
                    return path.join(dir, file);
                }).forEach(fs.unlink);
            });
        } else {
            fs.mkdir(dir, 0755);
        }
    });
}

