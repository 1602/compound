var fs = require('fs');
var path = require('path');
var singularize = require("../vendor/inflection").singularize;
var utils = require('./railway_utils');
var safe_merge = utils.safe_merge;
var Map = require('railway-routes').Map;
require('coffee-script');

function Railway() {

    global.railway = this;

    this.locales     = require('./locales');
    this.utils       = require('./railway_utils');

    this.ControllerBridge = require('./controller_bridge');

    this.controller  = require('./controller');
    this.extensions  = require('./extensions');
    this.generators  = require('./generators');
    this.tools       = require('./tools');
    this.logger      = require('./logger');
    this.routeMapper = new Map(app, this.ControllerBridge.uniCaller);
    this.helpers     = require('./helpers');

    this.models      = require('./models');
}

try {
    if (process.versions.node < '0.6' || true) {
        Railway.prototype.version = JSON.parse(fs.readFileSync(__dirname + '../package.json')).version;
    } else {
        Railway.prototype.version = require('../package').version;
    }
}catch(e){}

exports.init = function (app) {
    if (arguments.length == 2) {
        app = arguments[1];
    }

    // globalize app object
    global.app = app;
    app.root = process.cwd();

    // create API publishing object
    new Railway();

    // run environment.{js|coffee} and environments/{test|development|production}.{js|coffee}
    configureApp();

    // controllers should be loaded before extensions
    railway.controller.init();
    // extensions should be loaded before server startup
    railway.extensions.init();

    railway.models.init();

    // run config/initializers/*
    runInitializers();

    if (path.existsSync(app.root + '/config') && (path.existsSync(app.root + '/config/routes.js') || path.existsSync(app.root + '/config/routes.coffee'))) {
        railway.routeMapper.addRoutes(app.root + '/config/routes');
    }

    process.nextTick(function () {

        railway.locales.init();
        railway.logger.init();
        app.reloadModels = railway.models.loadModels;

        loadObservers();

        if (app.enabled('merge javascripts')) {
            ensureDirClean(app.root + '/public' + app.set('jsDirectory') + 'cache');
        }

        if (app.enabled('merge stylesheets')) {
            ensureDirClean(app.root + '/public' + app.set('cssDirectory') + 'cache');
        }

    });
};

exports.createServer = function (options) {
    options = options || {};

    var keys, app,
        key = options.key || process.cwd() + '/config/tsl.key',
        cert = options.cert || process.cwd() + '/config/tsl.cert';

    if (path.existsSync(key) && path.existsSync(cert)) {
        keys = {
            key: fs.readFileSync(key).toString('utf8'),
            cert: fs.readFileSync(cert).toString('utf8')
        };
    }

    if (keys) {
        app = require('express').createServer(keys);
    } else {
        app = require('express').createServer();
    }

    exports.init(app);

    return app;
};

function configureApp() {
    var mainEnv = app.root + '/config/environment';
    requireIfExists(mainEnv + '.js') || requireIfExists(mainEnv + '.coffee');
    var supportEnv = app.root + '/config/environments/' + app.settings.env;
    requireIfExists(supportEnv + '.js') || requireIfExists(supportEnv + '.coffee');

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

function requireIfExists(module) {
    if (path.existsSync(module)) {
        require(module);
        return true;
    } else {
        return false;
    }
}

function runInitializers() {

    var context = {global: {}};

    for (var i in app.models) {
        context[i] = app.models[i];
    }

    var initializersPath = app.root + '/config/initializers/';
    if (require('path').existsSync(initializersPath)) {
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
    path.exists(dir, function (exists) {
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

function ensureDirClean(dir) {
    path.exists(dir, function (exists) {
        if (exists) {
            fs.readdir(dir, function (err, files) {
                files.map(function (file) {
                    return path.join(dir, file);
                }).forEach(fs.unlink);
            });
        } else {
            fs.mkdir(dir, 0755);
        }
    });
}
