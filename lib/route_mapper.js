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
        // params are optional
        params = params || {};
        // if params arg omitted, second arg may be `actions`
        if (typeof params == 'function') {
            actions = params;
            params = {};
        }
        // we have bunch of actions here, will create routes for them
        var activeRoutes = getActiveRoutes(params);
        // but first, create subroutes
        if (typeof actions == 'function') {
            mapper.subroutes(name + '/:' + singularize(name) + '_id', actions);
        }
        // now let's walk through action routes
        for (var action in activeRoutes) {
            var route = activeRoutes[action].split(/\s+/);
            var method = route[0];
            var path = route[1];

            // append format
            if (path == '/') {
                path = '.:format?';
            } else {
                path += '.:format?';
            }

            // middleware logic (backward compatibility)
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

            // params.path setting allows to override common path component
            var effectivePath = (params.path || name) + path;

            // and call map.{get|post|update|delete}
            // with the path, controller, middleware and options
            mapper[method.toLowerCase()].call(
                mapper,
                effectivePath,
                name + '#' + action,
                skipMiddleware ? [] : params.middleware,
                getParams(action, params)
            );
        }

        // calculate set of routes based on params.only and params.except
        function getActiveRoutes(params) {
            var activeRoutes = {},
                availableRoutes =
                {   'index':   'GET     /'
                ,   'create':  'POST    /'
                ,   'new':     'GET     /new'
                ,   'edit':    'GET     /:id/edit'
                ,   'destroy': 'DELETE  /:id'
                ,   'update':  'PUT     /:id'
                ,   'show':    'GET     /:id'
                };

            // 1. only
            if (params.only) {
                if (typeof params.only == 'string') {
                    params.only = [params.only];
                }
                params.only.forEach(function (action) {
                    if (action in availableRoutes) {
                        activeRoutes[action] = availableRoutes[action];
                    }
                });
            }
            // 2. except
            else if (params.except) {
                if (typeof params.except == 'string') {
                    params.except = [params.except];
                }
                for (var action in availableRoutes) {
                    if (params.except.indexOf(action) == -1) {
                        activeRoutes[action] = availableRoutes[action];
                    }
                }
            }
            // 3. all
            else {
                for (var action in availableRoutes) {
                    activeRoutes[action] = availableRoutes[action];
                }
            }
            return activeRoutes;
        }

        function getParams(action, params) {
            var p = {};
            var plural = action === 'index' || action === 'create';
            if (params.as) {
                p.as = plural ? params.as : singularize(params.as);
                p.as = ActionObserver.calc_helper_name(glob_path + p.as);
                if (action === 'new' || action === 'edit') {
                    p.as = action + '_' + p.as;
                }
            }
            if (params.path && !p.as) {
                var aname = plural ? name : singularize(name);
                aname = ActionObserver.calc_helper_name(glob_path + aname);
                p.as = action === 'new' || action === 'edit' ? action + '_' + aname : aname;
            }
            return p;
        }
    };

    ['get', 'post', 'put', 'delete', 'all'].forEach(function (method) {
        mapper[method] = function (subpath, controller_action, before_filter, options) {

            // if (typeof controller_action !== 'string') {
                // return app[method](glob_path + subpath.replace(/^\/|\/$/, ''), ActionObserver.genericHook(controller_action, before_filter));
            // }

            var controller = controller_action.split('#')[0],
                action = controller_action.split('#')[1], path, observer;
            if (typeof subpath === 'string') {
                path = glob_path + subpath.replace(/^\/|\/$/, '');
                observer = ActionObserver.get(path, controller, ns + controller);
            } else {
                path = subpath;
                observer = ActionObserver.get(subpath.toString(), controller, ns + controller);
            }

            // only accept functions in before filter when its an array
            if (before_filter instanceof Array) {
                var before_filter_functions = before_filter.filter(function(filter) {
                   return (typeof filter === 'function');
                });
                before_filter = before_filter_functions.length > 0 ? before_filter_functions : null;
            }

            if (!(typeof before_filter === 'function' || (before_filter instanceof Array)) && typeof options === 'undefined') {
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
                helper: options.as || ActionObserver.calc_helper_name(path, action),
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

    // Shortcut for map.root('home#index')
    mapper.root = function (controller_action, before_filter, options) {
        mapper.get('', controller_action, before_filter, options);
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
