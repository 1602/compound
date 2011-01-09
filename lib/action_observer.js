var singularize = require("../vendor/inflection").singularize;
var safe_merge = require("./railway_utils").safe_merge;
var helpers = exports.helpers = require('./helpers');

// global url helper
global.path_to = {};

function ActionObserver(base_path, ctl_name, ctl_file) {
    if (!ctl_file) {
        ctl_file = ctl_name;
    }
    var controller = ActionObserver.load_controller(ctl_file);
    try {
        var controller_helper = require(ctl_file + '_helper.js');
    } catch(e) {
        controller_helper = {};
    }
    controller.base_path = base_path;
    var super = {
        layout: controller.render && controller.render.layout || 'application',
        base_path: controller.base_path
    };
    this.respond_to = function (action_name) {
        return action_name.charAt(0) !== '_' && action_name in controller;
    };
    this.call = function (action_name, req, res) {
        controller[action_name](req, function (action, param) {
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
                if (!param) {
                    param = {};
                }
                param.base_path = param.base_path || base_path;
                param.path_to = path_to;
                res.render(ctl_file + '/' + action_name, {
                    layout: (controller.layout || super.layout) + '_layout',
                    locals: safe_merge(param, path_to, helpers, ActionObserver.application_helper, controller_helper),
                    debug: false
                });
                break;
            }
            if (!controller.render) {
                controller.render = {};
            }
            controller.render.layout = null;
            controller.render.locals = {};
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

ActionObserver.get = function get_observer(p, n, f) {
    cf = '_' + f;
    if (!get_observer[cf]) {
        get_observer[cf] = new ActionObserver(p, n, f);
    }
    return get_observer[cf];
}

ActionObserver.load_controller = function (name) {
    return require(name + '_controller.js');
};

module.exports = ActionObserver;
