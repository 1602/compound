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
    this.structure = {
        paths: {
            controllers: {},
            models: {},
            presenters: {},
            views: {},
            helpers: {},
            errors: {}
        },
        controllers: {},
        models: {},
        presenters: {},
        views: {},
        helpers: {},
        errors: {},
        register: function() {}
    };
    this.locales = [];
    this.utils = compoundUtils;
    this.controllerExtensions = controllerExtensions;
    this.helpers = helpers;
    this.parent = null;
    this.root = root || process.cwd();
    this.errors = this.structure.errors;
    this.elements = [];

    if (app) {
        app.on('mount', function(parent) {
            if (parent.compound) {
                compound.parent = parent.compound;
            } else if (parent.parent && parent.parent.compound) {
                compound.parent = parent.parent.compound;
            }
            if (compound.parent) {
                compound.parent.elements.push(compound);
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
    this.initialized = false;
    process.nextTick(function() {
        if (!compound.initialized) {
            compound.init(root);
        }
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
Compound.prototype.init = function initCompound(root) {
    var compound = this;
    compound.initialized = true;

    root = root || compound.root;

    // run environment.{js|coffee}
    // and environments/{test|development|production}.{js|coffee}
    compound.emit('configure');
    if (isServerSide && compound.app) {
        compound.configure(root);
    }
    compound.emit('after configure');

    // controllers should be loaded before extensions
    // compound.controller.init(root);

    // extensions should be loaded before server startup
    compound.emit('extensions', compound);
    compound.extensions(root);
    compound.emit('after extensions', compound);

    compound.emit('routes', compound.map, compound);
    if (isServerSide) {
        var routesFile = root + '/config/routes', routesFileName;
        if (existsSync(routesFile + '.js')) {
            routesFileName = routesFile + '.js';
        } else if (existsSync(routesFile + '.coffee')) {
            routesFileName = routesFile + '.coffee';
        }
        if (routesFileName) {
            compound.map.addRoutes(routesFileName, compound.bridge, compound);
        }
    }
    compound.emit('after routes', compound.map, compound);

    if ('function' === typeof compound.loadStructure) {
        compound.loadStructure(root);
    }
    compound.emit('structure', compound.structure, compound);

    // init models in app/models/*
    require('./models')(compound, root);
    compound.emit('models', compound.models, compound);

    // run config/initializers/*
    if (isServerSide && compound.app) {
        compound.runInitializers(root);
    }
    compound.emit('initializers', compound);

    compound.i18n(compound, root);

    compound.emit('ready', compound);

    return compound;
};

Compound.prototype.model = function(model, caseSensitive) {
    if (typeof model === 'function') {
        var name = model.modelName || model.name;
        if (!name) {
            throw new Error('Named function or jugglingdb model required');
        }
        this.models[name] = model;
        return model;
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

Compound.prototype.presenter = function(name) {
    return this.structure.presenters[name];
};

Compound.prototype.loadConfigs = function loadConfigs(dir) {
    var compound = this, app = compound.app;
    if (!app) {
        return;
    }
    fs.readdirSync(dir).forEach(function(file) {
        if (file[0] === '.' || file.match(/^(Roco|environment|routes|autoload)\.(js|coffee|json|yml|yaml)$/)) {
            return;
        }
        var filename = path.join(dir, file);
        var basename = path.basename(filename, path.extname(filename));
        var stats = fs.statSync(filename);
        if (stats.isFile()) {
            var conf = require(filename);
            if ('function' === typeof conf) {
                conf(compound);
            } else {
                app.set(basename, conf[app.get('env')]);
            }
        }
    });
};

/**
 * Run app configutators in `config/environment` and `config/environments/env`.
 * @param {Compound} compound - compound app descriptor.
 */
Compound.prototype.configure = function configureApp(root) {
    var compound = this;
    var app = compound.app;
    root = root || compound.root;
    var mainEnv = root + '/config/environment';

    if (root === compound.root) {
        app.set('views', root + '/app/views');
    }
    if (!requireIfExists(compound, mainEnv + '.js')) {
        requireIfExists(compound, mainEnv + '.coffee');
    }

    var supportEnv = app.root + '/config/environments/' + app.settings.env;
    if (!requireIfExists(compound, supportEnv + '.js')) {
        requireIfExists(compound, supportEnv + '.coffee');
    }

};

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
Compound.prototype.runInitializers = function runInitializers(root) {
    var queue, pattern, compound = this, initializersPath = path.join(
        root || compound.root, 'config', 'initializers');

    pattern = compound.app.get('ignore initializers pattern') || /^\./;

    if (existsSync(initializersPath)) {
        queue = fs.readdirSync(initializersPath).map(function(file) {
            if (file.match(pattern)) return false;
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
};
