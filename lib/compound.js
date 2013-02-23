var fs = require('fs'),
    path = require('path'),
    events = require('events'),
    util = require('util'),
    existsSync = fs.existsSync || path.existsSync,
    exists = fs.exists || path.exists,

    Map = require('railway-routes').Map,
    ControllerBridge = require('./controller-bridge'),
    compoundUtils = require('./utils'),
    controllerExtensions = require('./controller-extensions'),
    helpers = require('./helpers'),
    isServerSide = typeof window === 'undefined';

module.exports = Compound;

/**
 * Global compound API singleton.
 * Available everywhere in project.
 *
 */
function Compound(app, root) {
    var compound = this;
    this.models = {};
    this.structure = null;
    this.locales = [];
    this.utils = compoundUtils;
    this.controllerExtensions = controllerExtensions;
    this.helpers = helpers;
    this.parent = null;

    app.on('mount', function(parent) {
        if (parent.compound) {
            this.models = parent.compound.models;
            compound.parent = parent.compound;
        }
    }.bind(this));

    app.compound = this;
    app.models = this.models;

    this.app = app;
    this.root = app.root = root;

    this.controller = require('kontroller').BaseController;

    this.i18n = require('./i18n');

    this.controllerBridge = new ControllerBridge(this);
    this.bridge = this.controllerBridge.uniCaller.bind(this.controllerBridge);
    this.map = new Map(app, this.bridge);

    if (this.constructor.name === 'CompoundClient') {
        return;
    }
    process.nextTick(function() {
        app.compound.init();
    });
}

util.inherits(Compound, events.EventEmitter);

/**
 * Initialize compound application:
 *
 *  - start http server
 *  - load modules
 *  - run configurators (config/environment, config/environments/{env})
 *  - init controllers
 *  - init extensions (including ORM and db/schema)
 *  - init assets compiler
 *  - init models
 *  - run initializers `config/initializers/*`
 *  - add routes
 *  - locales
 *  - loggers
 *  - observers
 *  - assets
 *
 * @param {Object} app - express server, may contain optional `root` member.
 * @return {Compound} compound - compound app descriptor.
 */
Compound.prototype.init = function initCompound() {
    var compound = this;
    var app = this.app;

    // run environment.{js|coffee}
    // and environments/{test|development|production}.{js|coffee}
    compound.emit('configure');
    if (isServerSide) {
        configureApp(compound);
    }
    compound.emit('after configure');

    // controllers should be loaded before extensions
    // compound.controller.init(root);

    compound.emit('routes', compound.map, compound);
    if (isServerSide && existsSync(app.root + '/config/routes.js') ||
        existsSync(app.root + '/config/routes.coffee')) {
            compound.map.addRoutes(app.root + '/config/routes',
            compound.bridge);
    }

    // extensions should be loaded before server startup
    compound.emit('extensions', compound);
    compound.extensions();
    compound.emit('after extensions', compound);

    compound.structure = compound.structure();
    compound.emit('structure', compound.structure, compound);

    // init models in app/models/*
    require('./models')(compound);
    compound.emit('models', compound.models, compound);

    // run config/initializers/*
    if (isServerSide) {
        runInitializers(compound);
    }
    compound.emit('initializers', compound);

    compound.i18n(compound);

    if (isServerSide && compound.app.enabled('merge javascripts')) {
        ensureDirClean(compound.app.root + '/public' +
            compound.app.set('jsDirectory'), 'cache');
    }

    if (isServerSide && compound.app.enabled('merge stylesheets')) {
        ensureDirClean(compound.app.root + '/public' +
            compound.app.set('cssDirectory'), 'cache');
    }

    return compound;
};

/**
 * Run app configutators in `config/environment` and `config/environments/env`.
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
    if (fs.existsSync(module)) {
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
        'should export function(compound) but given ' + typeof mod);
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
