// monkey patch ejs
var ejs = require('ejs'), old_parse = ejs.parse;
ejs.parse = function () {
    var str = old_parse.apply(this, Array.prototype.slice.call(arguments));
    return str.replace('var buf = [];', 'var buf = []; arguments.callee.buf = buf;');
};

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
    app.root = process.cwd();
    global.app = app;
    configureApp();
    require('./locales.js').init();
    require('./models.js').init();
    app.helpers = require('./helpers');
    // bad
    ActionObserver.application_helper = path.existsSync(app.root + '/app/helpers/application_helper.js') ?
        require(app.root + '/app/helpers/application_helper.js') : {};
    runInitializers();
    return {
        routes: add_routes(app),
        models: global.models
    };
};

function configureApp () {
    var mainEnv = app.root + '/config/environment';
    requireIfExists(mainEnv + '.js') || requireIfExists(mainEnv + '.coffee');
    var supportEnv = app.root + '/config/environments/' + app.settings.env;
    requireIfExists(supportEnv + '.js') || requireIfExists(supportEnv + '.coffee');
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

