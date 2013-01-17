var singularize = require('../support/inflection').singularize;

exports.Map = Map;

/**
 * Routing map drawer. Encapsulates all logic required for drawing maps:
 * namespaces, resources, get, post, put, ..., all requests
 *
 * @param {Object} app - RailwayJS or ExpressJS application
 * @param {Function} bridge - some bridge method that will server requests from
 * routing map to application
 *
 * Usage example:
 *
 *     var map = new require('railway-routes').Map(app, handler);
 *     map.resources('posts');
 *     map.namespace('admin', function (admin) {
 *        admin.resources('users');
 *     });
 *
 * Example `handler` loads controller and performs required action:
 *
 *     function handler(ns, controller, action) {
 *         try {
 *             var ctlFile = './controllers/' + ns + controller + '_controller';
 *             var responseHandler =  require(ctlFile)[action];
 *         } catch(e) {}
 *         return responseHandler || function (req, res) {
 *             res.send('Handler not found for ' + ns + controller + '#' + action);
 *         };
 *     }
 *
 */
function Map(app, bridge) {
    if (!(this instanceof Map)) return new Map(app, bridge);
    this.app = app;
    this.bridge = bridge;
    this.paths = [];
    this.ns = '';
    // wtf???
    this.globPath = '/';
    this.pathTo = {};
    this.dump = [];
    this.middlewareStack = [];
}

/**
 * Calculate url helper name for given path and action
 *
 * @param {String} path
 * @param {String} action
 */
Map.prototype.urlHelperName = function (path, action) {
    if (path instanceof RegExp) {
        path = path.toString().replace(/[^a-z]+/ig, '/');
    }

    // handle root paths
    if (path === '' || path === '/') return 'root';

    // remove trailing slashes and split to parts
    path = path.replace(/^\/|\/$/g, '').split('/');

    var helperName = [];
    path.forEach(function (token, index, all) {
        // skip variables
        if (token[0] == ':') return;

        var nextToken = all[index + 1] || '';
        // current token is last?
        if (index == all.length - 1) {
            token = token.replace(/\.:format\??$/, '');
            // same as action? - prepend
            if (token == action) {
                helperName.unshift(token);
                return;
            }
        }
        if (nextToken[0] == ':' || nextToken == 'new.:format?') {
            token = singularize(token);
        }
        helperName.push(token);
    });
    return helperName.join('_');
};

/**
 * Map root url
 */
Map.prototype.root = function (handler, middleware, options) {
    this.get('/', handler, middleware, options);
};

['get', 'post', 'put', 'delete', 'del', 'all'].forEach(function (method) {
    Map.prototype[method] = function (subpath, handler, middleware, options) {

        var controller, action;
        if (typeof handler === 'string') {
            controller = handler.split('#')[0];
            action = handler.split('#')[1];
        }

        var path;
        if (typeof subpath === 'string') {
            path = this.globPath + subpath.replace(/^\/|\/$/, '');
        } else { // regex???
            path = subpath;
        }

        // only accept functions in before filter when it's an array
        if (middleware instanceof Array) {
            var before_filter_functions = middleware.filter(function(filter) {
                return (typeof filter === 'function');
            });
            middleware = before_filter_functions.length > 0 ? before_filter_functions : null;
        }

        if (!(typeof middleware === 'function' || (middleware instanceof Array)) && typeof options === 'undefined') {
            options = middleware;
            middleware = null;
        }

        if (!options) {
            options = {};
        }

        path = options.collection ? path.replace(/\/:.*_id/, '') : path;

        var args = [path];
        if (middleware) {
            args = args.concat(this.middlewareStack.concat(middleware));
        }
        args = args.concat(this.bridge(this.ns, controller, action, options));

        this.dump.push({
            helper: options.as || this.urlHelperName(path, action),
            method: method,
            path: path,
            file: this.ns + controller,
            name: controller,
            action: action
        });

        this.addPath(path, action, options.as);

        this.app[method].apply(this.app, args);
    };
});

/**
 * Add path helper to `pathTo` collection
 */
Map.prototype.addPath = function (templatePath, action, helperName) {
    var app = this.app;

    if (templatePath instanceof RegExp) {
        // TODO: think about adding to `path_to` routes by reg ex
        return;
    }
    var paramsLength = templatePath.match(/\/:/g);
    paramsLength = paramsLength === null ? 0 : paramsLength.length;
    helperName = helperName || this.urlHelperName(templatePath, action);

    // already defined? not need to redefine
    if (this.pathTo[helperName]) return;

    this.pathTo[helperName] = function () {
        if (arguments.length < paramsLength) {
            return '';
            // throw new Error('Expected at least ' + paramsLength + ' params for build path ' + templatePath + ' but only ' + arguments.length + ' passed');
        }
        var value, arg, path = templatePath;
        for (var i = 0; i < paramsLength; i += 1) {
            value = null;
            arg = arguments[i];
            if (arg && typeof(arg.to_param) == 'function') {
                //value = arg.to_param();
            } else if (typeof(arg) === 'object' && (arg.id || arg.constructor.name !== 'ObjectID')) {
                value = arg.id;
            } else {
                value = arg && arg.toString ? arg.toString() : arg;
            }
            path = path.replace(/:\w*/, '' + value);
        }
        if (arguments[paramsLength]) {
            var query = [];
            for (var key in arguments[paramsLength]) {
                if ('function' == typeof(arguments[paramsLength][key])) {
                    continue;
                }

                var key_regexp = new RegExp('\\b:' + key + '\\b');

                if (key == 'format' && path.match(/\.:format\??$/)) {
                    path = path.replace(/\.:format\??$/, '.' + arguments[paramsLength][key]);
                } else if (path.match(key_regexp)) {
                    path = path.replace(key_regexp, arguments[paramsLength][key]);
                } else {
                    query.push(key + '=' + arguments[paramsLength][key]);
                }
            }
            if (query.length) {
                path += '?' + query.join('&');
            }
        }
        path = path.replace(/\.:format\?/, '');
        // add ability to hook url handling via app
        if (this.app.hooks && this.app.hooks.path) {
            this.app.hooks.path.forEach(function (hook) {
                path = hook(path);
            });
        }
        var appprefix = '';
        if (app.path) {
            appprefix = app.path();
        } else {
            appprefix = app.set('basepath') || '';
        }
        return appprefix + path;
    }.bind(this);
    this.pathTo[helperName].toString = function () {
        return this.pathTo[helperName]();
    }.bind(this);
}

/**
 * Resources mapper
 *
 * Example
 *
 *     map.resources('users');
 *
 */
Map.prototype.resources = function (name, params, actions) {
    var self = this;
    // params are optional
    params = params || {};

    // if params arg omitted, second arg may be `actions`
    if (typeof params == 'function') {
        actions = params;
        params = {};
    }

    params.appendFormat = ('appendFormat' in params) ? params.appendFormat : true;

    // If resource uses the path param, it's subroutes should be
    // prefixed by path, not the resource's name
    // i.e.:
    // map.resource('users', {path: ':username'}, function(user) {
    //   user.resources('posts);
    // });
    //
    // /:username/posts.:format?
    // /:username/posts/new.:format?
    // etc.
    var prefix = params.path ? params.path : name;

    // we have bunch of actions here, will create routes for them
    var activeRoutes = getActiveRoutes(params);
    // but first, create subroutes
    if (typeof actions == 'function') {
        if (params.singleton)
            this.subroutes(prefix, actions); // singletons don't need to specify an id
        else
            this.subroutes(prefix + '/:' + (singularize(name) || name) + '_id', actions);
    }
    // now let's walk through action routes
    for (var action in activeRoutes) {
        (function (action) {
            var route = activeRoutes[action].split(/\s+/);
            var method = route[0];
            var path = route[1];

            // append format
            if (params.appendFormat !== false) {
                if (path == '/') {
                    path = '.:format?';
                } else {
                    path += '.:format?';
                }
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

            var controller = params.controller || name;

            // and call map.{get|post|update|delete}
            // with the path, controller, middleware and options
            this[method.toLowerCase()].call(
                this,
                effectivePath,
                controller + '#' + action,
                skipMiddleware ? [] : params.middleware,
                getParams(action, params)
            );
        }.bind(this))(action);
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
            },
            availableRoutesSingleton =
            {   'show':    'GET     /'
                ,   'create':  'POST    /'
                ,   'new':     'GET     /new'
                ,   'edit':    'GET     /edit'
                ,   'destroy': 'DELETE  /'
                ,   'update':  'PUT     /'
            };

        if (params.singleton)
            availableRoutes = availableRoutesSingleton;

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
            p.as = self.urlHelperName(self.globPath + p.as);
            if (action === 'new' || action === 'edit') {
                p.as = action + '_' + p.as;
            }
        }
        if (params.path && !p.as) {
            var aname = plural ? name : singularize(name);
            aname = self.urlHelperName(self.globPath + aname);
            p.as = action === 'new' || action === 'edit' ? action + '_' + aname : aname;
        }
        return p;
    }
};

Map.prototype.resource = function(name, params, actions) {
    var self = this;
    // params are optional
    params = params || {};
    // if params arg omitted, second arg may be `actions`
    if (typeof params == 'function') {
        actions = params;
        params = {};
    }
    params.singleton = true;
    return this.resources(name, params, actions);
}

/*
 * Namespaces mapper.
 *
 * Example:
 *
 *     map.namespace('admin', function (admin) {
 *         admin.resources('user');
 *     });
 *
 */
Map.prototype.namespace = function (name, options, subroutes) {
    if (typeof options === 'function') {
        subroutes = options;
        options = null;
    }
    if (options && typeof options.middleware === 'function') {
        options.middleware = [options.middleware];
    }
    // store previous ns
    var old_ns = this.ns, oldGlobPath = this.globPath;
    // add new ns to old (ensure tail slash present)
    this.ns = old_ns + name.replace(/\/$/, '') + '/';
    this.globPath = oldGlobPath + name.replace(/\/$/, '') + '/';
    if (options && options.middleware) {
        this.middlewareStack = this.middlewareStack.concat(options.middleware);
    }
    subroutes(this);
    if (options && options.middleware) {
        options.middleware.forEach([].pop.bind(this.middlewareStack));
    }
    this.ns = old_ns;
    this.globPath = oldGlobPath;
};

Map.prototype.subroutes = function (name, subroutes) {
    // store previous ns
    var oldGlobPath = this.globPath;
    // add new ns to old (ensure tail slash present)
    this.globPath = oldGlobPath + name.replace(/\/$/, '') + '/';
    subroutes(this);
    this.globPath = oldGlobPath;
};

/**
 * Load routing map from module at `path`. Module should have `routes` function
 * or export single function:
 *
 *     module.exports = function (map) {
 *         map.resources('books');
 *     });
 */
Map.prototype.addRoutes = function (path, customBridge) {
    var map = this;
    var routes = require(path);
    routes = routes.routes || routes;
    if (typeof routes !== 'function') {
        throw new Error('Routes is not defined in ' + path);
    }
    // temporarily change bridge
    if (customBridge) {
        bridge = map.bridge;
        map.bridge = customBridge;
    }
    var r = routes(map);
    if (customBridge) {
        map.bridge = bridge;
    }
    return r;
};