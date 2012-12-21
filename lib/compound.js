var fs = require('fs');
var path = require('path');
var singularize = require('../vendor/inflection').singularize;
var express = require('express');
var utils = require('./utils');
var safe_merge = utils.safe_merge;
var Map = require('railway-routes').Map;
var existsSync = fs.existsSync || path.existsSync;
var exists = fs.exists || path.exists;
var cs = require('coffee-script');
var Module = require('module').Module;
var events = require('events');
var util = require('util');
var http = require('http');

/**
 * Global compound API singleton.
 * Available everywhere in project.
 *
 * @constructor
 * @see compound.html#
 * @see /1602/kontroller
 * @see extensions.html#
 * @see generators.html#
 * @see tools.html#
 * @see logger.html#
 * @see helpers.html#
 * @see model.html#
 */
function Compound(app, root) {
    app.railway = app.compound = this;
    this.__defineGetter__('rootModule', function() {
        return module.parent;
    });
    this.app = app;
    this.root = app.root = root;
    this.utils = utils;
    this.logger = require('./logger');
    this.logger.init(this);

    var AssetsCompiler = require('./assets-compiler');
    this.assetsCompiler = new AssetsCompiler(this);
    
    this.ControllerBridge = require('./controller-bridge');
    this.controller = require('kontroller').BaseController;

    this.structure = require('./structure')(this);
    this.i18n = require('./i18n')(this);
    var bridge = this.controllerBridge = new this.ControllerBridge(this);
    this.extensions = require('./extensions');
    this.generators = require('./generators');
    this.tools = require('./tools');
    this.routeMapper = new Map(app, bridge.uniCaller.bind(bridge));
    this.helpers = require('./helpers');
    this.models = {};
    this.controllerExtensions = {};
    this.middleware = require('./middleware');

    this.server = http.createServer(app);

    app.listen = function(port, host, cb) {
        app.emit('before listening', this.server);
        this.server.listen(port, host, cb);
    }.bind(this);
}

util.inherits(Compound, events.EventEmitter);

/**
 * Grab compound version from package.json
 */
Compound.prototype.version = require('../package').version;

/**
 * Initialize compound application:
 *
 *  - load modules
 *  - run configurators (config/environment, config/environments/{env})
 *  - init controllers
 *  - init extensions (including ORM and db/schema)
 *  - init assets compiler
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
 * @return {Compound} compound - compound app descriptor.
 */
exports.init = function initCompound(app, root) {
    // create API publishing object
    var compound = new Compound(app, root || process.cwd());

    // run environment.{js|coffee}
    // and environments/{test|development|production}.{js|coffee}
    compound.emit('before configure');
    configureApp(compound);
    compound.emit('after configure');

    var exts = require('./controller-extensions');
    for (var i in exts) {
        compound.controllerExtensions[i] = exts[i];
    }

    // controllers should be loaded before extensions
    // compound.controller.init(root);

    // extensions should be loaded before server startup
    compound.emit('before extensions');
    compound.extensions();
    compound.emit('after extensions');

    if (existsSync(app.root + '/config') &&
        (existsSync(app.root + '/config/routes.js') ||
        existsSync(app.root + '/config/routes.coffee'))) {
            compound.routeMapper.addRoutes(app.root + '/config/routes',
            compound.controllerBridge.uniCaller.bind(compound.controllerBridge));
    }

    // everything else can be done after starting server
    process.nextTick(function() {
        compound.emit('post-init');
        compound.structure = compound.structure();
        compound.emit('structure loaded');

        // init models in app/models/*
        require('./models').init(compound);
        compound.emit('models loaded');

        // run config/initializers/*
        runInitializers(compound);
        compound.emit('after initializers');

        compound.i18n();

        if (compound.app.enabled('merge javascripts')) {
            ensureDirClean(compound.app.root + '/public' +
                compound.app.set('jsDirectory'), 'cache');
        }

        if (compound.app.enabled('merge stylesheets')) {
            ensureDirClean(compound.app.root + '/public' +
                compound.app.set('cssDirectory'), 'cache');
        }
    });

    return compound;
};

/**
 * Create http server object. Automatically hook up SSL keys stored in
 * app.root/config/tsl.{cert|key}
 *
 * @param {Object} options - example:
 *   {root: __dirname, any other options for express}.
 * @return {Function} express server.
 */
exports.createServer = function(options) {
    options = options || {};
    if (typeof options === 'string') {
        options = {root: options};
    }
    var root = options.root || process.cwd();
    delete options.root;

    var app = express(options);

    exports.init(app, root);

    app.express2 = !!express.version.match(/^2/);
    app.express3 = !!express.version.match(/^3/);

    return app;
};

/**
 * Run app configutators in `config/environment` and `config/environments/env`.
 * Also try to monkey patch ejs and jade. **weird**
 * @param {Compound} compound - compound app descriptor.
 */
function configureApp(compound) {
    var app = compound.app;
    var root = compound.root;
    var mainEnv = root + '/config/environment';

    app.set('views', root + '/app/views');
    requireIfExists(compound, mainEnv + '.js') ||
    requireIfExists(compound, mainEnv + '.coffee');

    var supportEnv = app.root + '/config/environments/' + app.settings.env;
    requireIfExists(compound, supportEnv + '.js') ||
    requireIfExists(compound, supportEnv + '.coffee');

}

/**
 * Require `module` if it exists
 *
 * @param {Compound} compound - express app.
 * @param {String} module - path to file.
 * @return {Boolean} success - returns true when required file exists.
 */
function requireIfExists(compound, module) {
    if (utils.existsSync(module)) {
        evalInContextOf(compound, module);
        return true;
    } else {
        return false;
    }
}

function evalInContextOf(compound, filename) {
    var mod, err;
    try {
        mod = require(filename);
    } catch (e) {
        err = e;
    }
    if (typeof mod !== 'function') {
        console.log('WARNING: ', filename,
        'should export function(compound)');
    }
    if (err) {
        throw err;
    }
    if (typeof mod === 'function') {
        mod(compound);
    }
}

/**
 * Run initializers in sandbox mode
 * @param {Compound} rw - compound descriptor.
 */
function runInitializers(rw) {

    var initializersPath = rw.root + '/config/initializers/';
    if (existsSync(initializersPath)) {
        fs.readdirSync(initializersPath).forEach(function(file) {
            if (file.match(/^\./)) return;
            var filename = initializersPath + file;
            evalInContextOf(rw, filename);
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
