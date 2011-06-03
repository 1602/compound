var fs = require('fs');
var path = require('path');
var singularize = require("../vendor/inflection").singularize;
var utils = require('./railway_utils');
var safe_merge = utils.safe_merge;
var ActionObserver = require('./action_observer');
var Mapper = require('./route_mapper').Mapper;
require('coffee-script');

function Railway () {

    global.railway = this;

    this.utils       = require('./railway_utils');
    this.models      = require('./models');
    this.locales     = require('./locales');
    this.helpers     = require('./helpers');
    this.controller  = require('./controller');
    this.extensions  = require('./extensions');
    this.generators  = require('./generators');
    this.tools       = require('./tools');
    this.logger      = require('./logger');
    this.routeMapper = new Mapper(app);
}


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

    railway.logger.init();

    railway.locales.init();
    railway.models.init();
    railway.controller.init();
    railway.extensions.init();

    // TODO: remove this publishing
    app.helpers = railway.helpers;

    // wtf???
    ActionObserver.application_helper = path.existsSync(app.root + '/app/helpers/application_helper.js') ?
        require(app.root + '/app/helpers/application_helper.js') : {};

    // run config/initializers/*
    runInitializers();

    if (path.existsSync(app.root + '/config') && (path.existsSync(app.root + '/config/routes.js') || path.existsSync(app.root + '/config/routes.coffee'))) {
        railway.routeMapper.addRoutes(app.root + '/config/routes');
    }

    process.nextTick(function () {
        loadObservers();

        if (app.enabled('merge javascripts')) {
            ensureDirClean(app.root + '/public/javascripts/cache');
        }

        if (app.enabled('merge stylesheets')) {
            ensureDirClean(app.root + '/public/stylesheets/cache');
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

function configureApp () {
    var mainEnv = app.root + '/config/environment';
    requireIfExists(mainEnv + '.js') || requireIfExists(mainEnv + '.coffee');
    var supportEnv = app.root + '/config/environments/' + app.settings.env;
    requireIfExists(supportEnv + '.js') || requireIfExists(supportEnv + '.coffee');

    if (!app.extensions || !app.extensions['ejs-ext']) {
        // monkey patch ejs
        var ejs = require('ejs'), old_parse = ejs.parse;
        ejs.parse = function () {
            var str = old_parse.apply(this, Array.prototype.slice.call(arguments));
            return str.replace('var buf = [];', 'var buf = []; arguments.callee.buf = buf;');
        };
    }

}

function requireIfExists (module) {
    if (path.existsSync(module)) {
        require(module);
        return true;
    } else {
        return false;
    }
}

function runInitializers () {
    var Script = require('vm').Script,
        context = Script.createContext({
            global:  {}
        });
        if (process.cov) {
            context.__cov = __cov;
        }

    if (global.models) {
        for (var i in models) {
            context[i] = models[i];
        }
    }
    var initializersPath = app.root + '/config/initializers/';
    if (require('path').existsSync(initializersPath)) {
        fs.readdirSync(initializersPath).forEach(function (file) {
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
function loadObservers () {
    var dir = app.root + '/app/observers';
    path.exists(dir, function (exists) {
        if (exists) {
            fs.readdir(dir, function (err, files) {
                if (!err && files) {
                    files.forEach(function (file) {
                        require(path.join(dir, file));
                    });
                }
            });
        }
    });
}

function ensureDirClean (dir) {
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
