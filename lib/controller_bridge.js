var singularize = require("../vendor/inflection").singularize,
    safe_merge  = require("./railway_utils").safe_merge,
    helpers     = exports.helpers = require('./helpers'),
    undef;

var ControllerBrigde = {};

ControllerBrigde.uniCaller = function (controller, action) {
    return function (req, res) {
        var ctl = ControllerBrigde.loadController(controller || req.params.controller);
        if (app.disabled('model cache')) {
            app.reloadModels(function () {
                ctl.perform(action || req.params.action, req, res);
            });
        } else {
            ctl.perform(action || req.params.action, req, res);
        }
    };
};

ControllerBrigde.dump = [];

ControllerBrigde.addPath = function (template_path, action) {
    if (template_path instanceof RegExp) {
        // TODO: think about adding to `path_to` routes by reg ex
        return;
    }
    var params_length = template_path.match(/\/:/g);
    params_length = params_length === null ? 0 : params_length.length;
    var helper_name = ControllerBrigde.urlHelperName(template_path, action);
    if (path_to[helper_name]) return;
    path_to[helper_name] = function () {
        if (arguments.length < params_length) {
            return '';
            // throw new Error('Expected at least ' + params_length + ' params for build path ' + template_path + ' but only ' + arguments.length + ' passed');
        }
        var value, arg, path = template_path;
        for (var i = 0; i < params_length; i += 1) {
            value = null;
            arg = arguments[i];
            if (arg && typeof arg.to_param == 'function') {
                value = arg.to_param();
            } else if (arg && arg.id) {
                value = arg.id;
            } else {
                value = arg;
            }
            path = path.replace(/:\w*/, value);
        }
        if (arguments[params_length]) {
            var query = [];
            for (var key in arguments[params_length]) {
                if (key == 'format' && path.match(/\.:format\??$/)) {
                    path = path.replace(/\.:format\??$/, '.' + arguments[params_length][key]);
                } else {
                    query.push(key + '=' + arguments[params_length][key]);
                }
            }
            if (query.length) {
                path += '?' + query.join('&');
            }
        }
        path = path.replace(/\.:format\?/, '');
        if (app.hooks && app.hooks.path) {
            app.hooks.path.forEach(function (hook) {
                path = hook(path);
            });
        }
        return path;
    };
    path_to[helper_name].toString = function () {
        return path_to[helper_name]();
    };
};

ControllerBrigde.urlHelperName = function (path, action) {
    if (path instanceof RegExp) {
        path = path.toString().replace(/[^a-z]+/ig, '/');
    }

    // remove trailing slashes
    path = path.replace(/^\/|\/$/g, '').split('/');

    // handle root paths
    if (path === '' || path === '/') {
        return 'root';
    }

    var helper_name = [];
    path.forEach(function (token, index, all) {
        if (token[0] == ':') return;
        var next_token = all[index + 1] || '';
        if (index == all.length - 1) {
            token = token.replace(/\.:format\??$/, '');
            if (token == action) {
                helper_name.unshift(token);
                return;
            }
        }
        if (next_token[0] == ':' || next_token == 'new.:format?') {
            token = singularize(token);
        }
        helper_name.push(token);
    });
    return helper_name.join('_');
};

var cache = {};

ControllerBrigde.init = function () {

    cache = {};

    // global url helper
    global.path_to = {root: function () {return '/';}}
    global.path_to.root.toString = function () {return '/';};

};

ControllerBrigde.loadController = function (controller) {
    return railway.controller.load(controller);
};

module.exports = ControllerBrigde;

