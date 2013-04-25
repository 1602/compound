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
    isServerSide = typeof window === 'undefined',
    kontroller = require('kontroller'),
    i18n = require('./i18n');

module.exports = Compound;

/**
 * Global compound API singleton.
 * Available everywhere in project.
 *
 */
function Compound(app, root) {
    var compound = this;
    this.models = {};
    this.__localeData = {};
    this.structure = null;
    this.locales = [];
    this.utils = compoundUtils;
    this.controllerExtensions = controllerExtensions;
    this.helpers = helpers;
    this.parent = null;
    this.root = root || process.cwd();

    if (app) {
        app.on('mount', function(parent) {
            if (parent.compound) {
                compound.parent = parent.compound;
                compound.models = parent.compound.models;
            }
        });

        app.compound = compound;
        app.models = compound.models;
        app.root = root;
        compound.app = app;
    }

    this.controller = kontroller.BaseController;

    this.i18n = i18n;

    this.controllerBridge = new ControllerBridge(this);
    this.bridge = this.controllerBridge.uniCaller.bind(this.controllerBridge);
    this.map = new Map(app, this.bridge);

    if (this.constructor.name === 'CompoundClient') {
        return;
    }
    process.nextTick(function() {
        compound.init();
    });
}

util.inherits(Compound, events.EventEmitter);

/**
 * Initialize compound application:
 *
 *  - start http server
 *  - run configurators (config/environment, config/environments/{env})
 *  - add routes
 *  - init extensions (including ORM and db/schema)
 *  - init assets compiler
 *  - init models
 *  - run initializers `config/initializers/*`
 *  - locales
 *  - observers
 *  - assets
 *
 * @param {Object} app - express server, may contain optional `root` member.
 * @return {Compound} compound - compound app descriptor.
 */
Compound.prototype.init = function initCompound() {
    var compound = this;

    // run environment.{js|coffee}
    // and environments/{test|development|production}.{js|coffee}
    compound.emit('configure');
    if (isServerSide && compound.app) {
        configureApp(compound);
    }
    compound.emit('after configure');

    // controllers should be loaded before extensions
    // compound.controller.init(root);

    // extensions should be loaded before server startup
    compound.emit('extensions', compound);
    compound.extensions();
    compound.emit('after extensions', compound);

    compound.emit('routes', compound.map, compound);
    if (isServerSide) {
        var routesFile = this.root + '/config/routes', routesFileName;
        if (existsSync(routesFile + '.js')) {
            routesFileName = routesFile + '.js';
        } else if (existsSync(routesFile + '.coffee')) {
            routesFileName = routesFile + '.coffee';
        }
        if (routesFileName) {
            compound.map.addRoutes(routesFileName, compound.bridge);
        }
    }
    compound.emit('after routes', compound.map, compound);

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

    compound.emit('ready', compound);

    return compound;
};

Compound.prototype.model = function(model, caseSensitive) {
    if (typeof model === 'function') {
        var name = model.modelName || model.name;
        if (!name) {
            throw new Error('Named function or jugglingdb model required')
        }
        return this.models[name] = model;
    }
    if (!caseSensitive) {
        model = model.toLowerCase();
    }
    var foundModel;
    for (var i in this.models) {
        if (model === i || !caseSensitive && model === i.toLowerCase()) {
            foundModel = this.models[i];
        }
    }
    return foundModel;
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
        requireFun(module)(compound);
        return true;
    } else {
        return false;
    }
}

function requireFun(filename) {
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
        return mod;
    } else {
        return function() {};
    }
}

/**
 * Run initializers in sandbox mode
 *
 * @param {Compound} compound - compound descriptor.
 */
function runInitializers(compound) {
    var queue,
        initializersPath = path.join(compound.root, 'config', 'initializers');

    if (existsSync(initializersPath)) {
        queue = fs.readdirSync(initializersPath).map(function(file) {
            if (file.match(/^\./)) return false;
            return requireFun(path.join(initializersPath, file));
        }).filter(Boolean);

        next();
    }

    function next() {
        var initializer = queue.shift();
        if (!initializer) return;
        if (initializer.length === 2) {
            initializer(compound, next);
        } else {
            initializer(compound);
            next();
        }
    }

}
