var singularize = require("../vendor/inflection").singularize;
var utils = require('./railway_utils'), safe_merge = utils.safe_merge;
var ActionObserver = require('./action_observer');
var Mapper = require('./route_mapper');
var fs = require('fs');
var path = require('path');
require('coffee-script');

var add_routes = function (app) {
    var routes = require(app.root + '/config/routes').routes;
    if (!routes) {
        throw new Error('Routes is not defined in config/routes.js');
    }
    var mapper = new Mapper(app);
    routes(mapper);
    return mapper;
};

exports.init = function (app) {
    if (arguments.length == 2) {
        app = arguments[1];
    }
    app.root = process.cwd();
    global.app = app;
    configureApp();
    require('./locales').init();
    require('./models').init();
    app.helpers = require('./helpers');
    require('./extensions').init();
    // bad
    ActionObserver.application_helper = path.existsSync(app.root + '/app/helpers/application_helper.js') ?
        require(app.root + '/app/helpers/application_helper.js') : {};
    runInitializers();
    return {
        routes: add_routes(app),
        models: global.models
    };
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

function requireIfExists(module) {
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

