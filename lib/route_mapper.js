var singularize = require("../vendor/inflection").singularize;
var ActionObserver = require('./action_observer');

exports.Mapper = Mapper;

function Mapper (app) {
    var mapper = this,
        controllers = [],
        ns = '',
        glob_path = '/',
        middleware;

    this.namespace = function (name, subroutes) {
        // store previous ns
        var old_ns = ns, old_glob_path = glob_path;
        // add new ns to old (ensure tail slash present)
        ns = old_ns + name.replace(/\/$/, '') + '/';
        glob_path = old_glob_path + name.replace(/\/$/, '') + '/';
        subroutes(mapper);
        ns = old_ns;
        glob_path = old_glob_path;
    };

    this.subroutes = function (name, subroutes) {
        // store previous ns
        var old_glob_path = glob_path;
        // add new ns to old (ensure tail slash present)
        glob_path = old_glob_path + name.replace(/\/$/, '') + '/';
        subroutes(mapper);
        glob_path = old_glob_path;
    };

    this.resources = function (name, params, actions) {
        params = params || {};
        if (typeof params == 'function') {
            actions = params;
        }
        var action_routes = {}, available_routes = 
        {   'index':   'GET     /'
        ,   'create':  'POST    /'
        ,   'new':     'GET     /new'
        ,   'edit':    'GET     /:id/edit'
        ,   'destroy': 'DELETE  /:id'
        ,   'update':  'PUT     /:id'
        ,   'show':    'GET     /:id'
        };
        if (params.only) {
            if (typeof params.only == 'string') {
                params.only = [params.only];
            }
            params.only.forEach(function (action) {
                if (action in available_routes) {
                    action_routes[action] = available_routes[action];
                }
            });
        } else if (params.except) {
            if (typeof params.except == 'string') {
                params.except = [params.except];
            }
            for (var action in available_routes) {
                if (params.except.indexOf(action) == -1) {
                    action_routes[action] = available_routes[action];
                }
            }
        } else {
            for (var action in available_routes) {
                action_routes[action] = available_routes[action];
            }
        }
        if (typeof actions == 'function') {
            mapper.subroutes(name + '/:' + singularize(name) + '_id', actions);
        }
        for (var action in action_routes) {
            var route = action_routes[action].split(/\s+/);
            var method = route[0];
            var path = route[1];
            if (path == '/') {
                path = '.:format?';
            } else {
                path += '.:format?';
            }
            var middlewareExcept = params.middlewareExcept, skipMiddleware = false;
            if (middlewareExcept) {
                if (typeof middlewareExcept == 'string') {
                    middlewareExcept = [middlewareExcept];
                }
                middlewareExcept.forEach(function (a) {
                    if (a == action) {
                        skipMiddleware = true;
                    }
                });
            }
            mapper[method.toLowerCase()].call(mapper, name + path, name + '#' + action, skipMiddleware ? [] : params.middleware);
        }
        //Pcreate_routes(app, glob_path, name, ns + name, action_routes, params.middleware);
    };

    ['get', 'post', 'put', 'delete'].forEach(function (method) {
        mapper[method] = function (subpath, controller_action, before_filter, options) {
            var controller = controller_action.split('#')[0],
                action = controller_action.split('#')[1], path, observer;
            if (typeof subpath === 'string') {
                path = glob_path + subpath.replace(/^\/|\/$/, '');
                observer = ActionObserver.get(path, controller, ns + controller);
            } else {
                path = subpath;
                observer = ActionObserver.get(subpath.toString(), controller, ns + controller);
            }

            if (typeof before_filter !== 'function' && typeof options === 'undefined') {
                options = before_filter;
                before_filter = null;
            }

            if (!options) {
                options = {};
            }

            path = options.collection ? path.replace(/\/:.*_id/, '') : path;

            var args = [path];
            if (before_filter) {
                args = args.concat(before_filter);
            }
            args = args.concat(observer.calling(action) || function (req, res) {
                res.send('Unknown action ' + action + ' for controller ' + controller);
            });
            observer.dump.push({
                helper: ActionObserver.calc_helper_name(path, action),
                method: method,
                path: path,
                file: ns + controller,
                name: controller,
                action: action
            });
            observer.add_path(path, action);
            app[method].apply(app, args);
        };
    });

    mapper.dump = function () {
        var result = [];
        var cache = ActionObserver.getCache();
        for (var key in cache) {
            cache[key].dump.forEach(function (data) {
                result.push(data);
            });
        }
        return result;
    };
}

Mapper.prototype.addRoutes = function addRoutes (path) {
    var routes;
    var routes = require(path).routes;
    if (!routes) {
        throw new Error('Routes is not defined in ' + path);
    }
    return routes(this);
};
