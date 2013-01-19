compound = window.compound = {
    root: '{{ ROOT }}'
};

var app = compound.app = {
    settings: {
        'view options': { complexNames: true }
    }, set: function (k, v) {
        if (arguments.length === 2) {
            app.settings[k] = v;

        } else if (arguments.length === 1) {
            return app.settings[k];
        }
    }, disabled: function (k) {
        if ((k in app.settings)) return false;
        return !app.settings[k];
    }, compound: compound
};

require.define('module', function () {});
require.define('fs', function(require, module, exports) {
    module.exports.readFileSync = function (path) {
        return compound.files[path];
    };

    module.exports.existsSync = function (path) {
        return path in compound.files;
    };
});

var ejs = require('ejs');
var fs = require('fs');
var Map = require('railway-routes').Map;
var ktl = require('kontroller');
var controllerExtensions = require('./node_modules/compound/lib/controller-extensions');

compound.files = {
    {{ FILES }}
};

compound.utils = require('./node_modules/compound/lib/utils');
compound.helpers = require('./node_modules/compound/lib/helpers');
compound.i18n = require('./node_modules/compound/lib/i18n')(compound)();

compound.structure = {
    controllers: {
        {{ CONTROLLERS }}
    },
    helpers: {
        {{ HELPERS }}
    },
    models: {
        {{ MODELS }}
    },
    views: {
        {{ VIEWS }}
    }
};

var routes = [];
var models = compound.models = {};

['get', 'post', 'put', 'delete', 'del', 'all'].forEach(function (method) {
    app[method] = function (path) {
        routes.push({
            method: method === 'delete' ? 'del' : method,
            path: path,
            re: new RegExp('^' + path.replace(/\.?:([^\/\?\.])+/g, '([^\/\?\.]+)') + '$'),
            params: (path.match(/:[^\/\?\.]+/g) || []).map(function (s) {
                return s.substr(1);
            }),
            tail: [].slice.call(arguments, 1)
        });
    };
});

var map = compound.map = compound.routeMapper = new Map(app, bridge);
require('./config/routes').routes(map);

function bridge(ns, controller, action) {
    return function (req, res, next) {
        var Controller = ktl.BaseController.constructClass(controller, compound.structure.controllers[controller]);
        Controller.prototype.pathTo = map.pathTo;

        for (var m in models) {
            Controller.prototype[m] = models[m];
        }

        for (var e in controllerExtensions) {
            Controller.prototype[e] = controllerExtensions[e];
        }

        var ctl = new Controller;
        ctl.compound = compound;
        ctl.app = compound.app;
        // console.log(controller, action);
        ctl.perform(action || req.params.action, req, res, function(err) {
        });
    };
}

function initializeBrowser() {
    $('a').live('click', handleRoute);
    $('form').live('submit', handleRoute);
    $(window).bind('popstate', function () {
        handleRoute(location.pathname, true);
    });

    function handleRoute(url, doNotPushState) {
        console.log('arguments', arguments);
        var $el = $(this);
        var method = 'GET';
        var data = {};
        var path;
        if (typeof url === 'string') {
            path = url;
        } else if ($el.is('form')) {
            $el.serializeArray().forEach(function (i) {
                var m = i.name.match(/^(.*?)\[(.*?)\]$/);
                if (m) {
                    data[m[1]] = data[m[1]] || {};
                    data[m[1]][m[2]] = i.value;
                } else {
                    data[i.name] = i.value;
                }
            });
            method = $el.attr('method');
            if (data._method) method = data._method;
            path = $el.attr('action');
        } else {
            path = $el.attr('href');
        }
        var m = match(path, method);
        console.log(m);
        if (m) {
            var params = [].slice.call(m.values, 1);
            params.forEach(function (v, i) {
                params[m.route.params[i]] = v;
            });
            var req = {
                url: path,
                method: method,
                session: {},
                originalMethod: method,
                header: function () {},
                param: function (name) {
                    return this.params[name];
                }, params: params, body: data, query: {},
                csrfToken: $('meta[name=csrf-token]').attr('content'),
                csrfParam: $('meta[name=csrf-param]').attr('content')
            };
            var res = {
                render: function (view, params, callback) {
                    // console.log('rendering', view);
                    var fn = compound.structure.views[view];
                    if (!fn) {
                        throw new Error('View ' + view + ' not found');
                    }
                    var html = fn(params);
                    if (callback) {
                        callback(null, html);
                    } else {
                        $('body').html(html.match(/<body[^>]*>([\s\S.]*)<\/body>/i)[1]);
                        $('title').text(html.match(/<title[^>]*>([\s\S.]*)<\/title>/i)[1]);
                        if (!doNotPushState) {
                            window.history.pushState(null, "", path);
                        }
                        // initializeBrowser();
                    }
                },
                redirect: function (url) {
                    // console.log('redirecting to', url);
                    handleRoute(url);
                }
            };
            try {
                m.route.tail[0](req, res);
            }catch(e){
                console.log(e.stack);
            }
            return false;
        } else {
            console.log('no routes matched', path);
            return true;
        }
    }
}
$(initializeBrowser);

function match(path, method) {
    var res;
    routes.forEach(function (r) {
        if (res) return;
        // console.log(method, r.method);
        // console.log(r.re, path);
        if (r.method.toLowerCase() !== method.toLowerCase()) return;
        var m = path.split(/[\?\#]/g)[0].match(r.re);
        if (m) {
            res = {
                route: r,
                params: r.params,
                values: m
            };
        }
    });
    return res;
}

// load models and schema

var jdb = require('jugglingdb');
var Schema = jdb.Schema;

var schema = new Schema(require('./node_modules/jugglingdb/lib/adapters/memory'));
var fn = new Function('context', 'require', 'with(context){(function(){' + compound.files['{{ ROOT }}/db/schema.js'] + '})()}');
fn(context(models, compound, app, schema), require);

for (var m in compound.structure.models) {
    (function (m, implementation) {
        var Model;
        for (var mm in models) {
            if (mm.toLowerCase() === m.toLowerCase()) {
                Model = models[mm];
            }
        }
        implementation({models: models}, Model);
    })(m, compound.structure.models[m]);
}

function context(models, railway, app, defSchema, done) {
    var ctx = {app: app},
        _models = {},
        settings = {},
        cname,
        schema,
        wait = connected = 0,
        nonJugglingSchema = false;

    done = done || function () {};

    /**
     * Multiple schemas support
     * example:
     * schema('redis', {url:'...'}, function () {
     *     describe models using redis connection
     *     ...
     * });
     * schema(function () {
     *     describe models stored in memory
     *     ...
     * });
     */
    ctx.schema = function () {
        var name = argument('string');
        var opts = argument('object') || {};
        var def = argument('function') || function () {};
        schema = new Schema(name || opts.driver || 'memory', opts);
        railway.orm._schemas.push(schema);
        wait += 1;
        ctx.gotSchema = true;
        schema.on('log', log);
        schema.on('connected', function () {
            if (wait === ++connected) done();
        });
        def();
        schema = false;
    };

    /**
     * Use custom schema driver
     */
    ctx.customSchema = function () {
        var def = argument('function') || function () {};
        nonJugglingSchema = true;
        def();
        Object.keys(ctx.exports).forEach(function (m) {
            ctx.define(m, ctx.exports[m]);
        });
        nonJugglingSchema = false;
    };
    ctx.exports = {};
    ctx.module = { exports: ctx.exports };

    /**
     * Define a class in current schema
     */
    ctx.describe = ctx.define = function (className, callback) {
        // console.log(className);
        var m;
        cname = className;
        _models[cname] = {};
        settings[cname] = {};
        if (nonJugglingSchema) {
            m = callback;
        } else {
            callback && callback();
            m = (schema || defSchema).define(className, _models[cname], settings[cname]);
        }
        if (global.railway) {
            global[cname] = m;
        }
        return models[cname] = ctx[cname] = m;
    };

    /**
     * Define a property in current class
     */
    ctx.property = function (name, type, params) {
        if (!params) params = {};
        if (typeof type !== 'function' && typeof type === 'object') {
            params = type;
            type = String;
        }
        params.type = type || String;
        _models[cname][name] = params;
    };

    /**
     * Set custom table name for current class
     * @param name - name of table
     */
    ctx.setTableName = function (name) {
        if (cname) settings[cname].table = name;
    };

    /**
     * If the Schema has additional types, add them to the context
     * e.g. MySQL has an additional Point type
     */
    if (Schema.types && Object.keys(Schema.types).length) {
        for (var typeName in Schema.types) {
            ctx[typeName] = Schema.types[typeName];
        }
    }
    ctx.Text = Schema.Text;

    /**
     * Specify rest path for client-side models
     */
    ctx.restPath = function (path) {
        if (cname) settings[cname].restPath = path;
    };

    return ctx;

    function argument(type) {
        var r;
        [].forEach.call(arguments.callee.caller.arguments, function (a) {
            if (!r && typeof a === type) r = a;
        });
        return r;
    }
}
