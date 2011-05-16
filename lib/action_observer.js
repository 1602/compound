var singularize = require("../vendor/inflection").singularize,
    safe_merge  = require("./railway_utils").safe_merge,
    helpers     = exports.helpers = require('./helpers'),
    undef;

// global url helper
global.path_to = {root: function () {return '/';}}
global.path_to.root.toString = function () {return '/';};

function ActionObserver(base_path, ctl_name, ctl_file) {
    if (!ctl_file) {
        ctl_file = ctl_name;
    }
    var controller = ActionObserver.loadController(base_path, ctl_name, ctl_file);
    try {
        var controller_helper = require(ctl_file + '_helper.js');
    } catch(e) {
        controller_helper = {};
    }
    this.respond_to = function (action_name) {
        return controller.respondTo(action_name);
    };
    this.call = function (action_name, req, res) {
        controller.perform(action_name, req, res);
        return;
        (function (action, param, params) {
            if (typeof action == 'function') {
                action.call(controller, res);
                return;
            }
            switch (action) {
                case 'send':
                res.send(param);
                break;
                case 'redirect':
                res.redirect(param || base_path);
                break;
                default:
                case 'render':
                var render_action;
                if (arguments.length == 3) {
                    render_action = param;
                    param = params;
                }
                if (!param) {
                    param = {};
                }
                param.path_to = path_to;
                param.request = req;
                res.render(ctl_file + '/' + (render_action || action_name), {
                    layout: (controller.layout || super.layout) + '_layout',
                    locals: safe_merge(param, path_to, helpers, ActionObserver.application_helper, controller_helper),
                    debug: false
                });
                break;
            }
            if (!controller._render) {
                controller._render = {};
            }
            controller._render.layout = null;
            controller._render.locals = {};
        });
    };
    this.calling = function (action_name) {
        var observer = this;
        if (observer.respond_to(action_name)) {
            return function (req, res) {
                observer.call(action_name, req, res);
            };
        } else {
            console.log('WARNING: controller ' + ctl_file + ' does not respond to action ' + action_name);
            return false;
        }
    }
    this.dump = [];
    this.add_path = function (template_path, action) {
        if (template_path instanceof RegExp) {
            // TODO: think about adding to `path_to` routes by reg ex
            return;
        }
        var params_length = template_path.match(/\/:/g);
        params_length = params_length === null ? 0 : params_length.length;
        var helper_name = ActionObserver.calc_helper_name(template_path, action);
        if (path_to[helper_name]) return;
        path_to[helper_name] = function () {
            if (arguments.length < params_length) {
                throw new Error('Expected at least ' + params_length + ' params for build path ' + path + ' but only ' + arguments.length + ' passed');
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
            return path;
        };
        path_to[helper_name].toString = function () { return template_path.replace(/\.:format\??$/, ''); };
    };
}
ActionObserver.calc_helper_name = function (path, action) {
    if (path instanceof RegExp) {
        path = path.toString().replace(/[^a-z]+/ig, '/');
    }
    path = path.replace(/^\/|\/$/g, '').split('/');
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

ActionObserver.get = function getObserver(p, n, f) {
    cf = '_' + f;
    if (!getObserver[cf]) {
        getObserver[cf] = new ActionObserver(p, n, f);
    }
    return getObserver[cf];
}

ActionObserver.loadController = function (base_path, ctl_name, ctl_file) {
    var filename = ctl_name + '_controller.js';
    return require('./controller').load(ctl_name, ctl_file, base_path);
};

module.exports = ActionObserver;
