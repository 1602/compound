var cache = {}, layoutsCache = {}, fs = require('fs'),
    path        = require('path'),
    // import railway utils
    utils       = require('./railway_utils'),
    safe_merge  = utils.safe_merge,
    camelize    = utils.camelize,
    classify    = utils.classify,
    underscore  = utils.underscore,
    singularize = utils.singularize,
    pluralize   = utils.pluralize,
    $           = utils.stylize.$,
    log         = utils.debug,
    runCode     = utils.runCode;

var IS_NODE_04 = process.versions.node < '0.6';

var id = 0;

function Controller(name) {

    this.id = ++id;

    var actions = {}, beforeFilters = [], afterFilters = [], self = this;

    if (!layoutsCache[name]) {
        // TODO: what if view engine name differs from extension?
        layoutsCache[name] = path.existsSync(app.root + '/app/views/layouts/' + name + '_layout.' + app.settings['view engine']) ? name : 'application';
    }

    var layout;
    var baseLayout = layout = layoutsCache[name];

    // allow to disable layout by default for all views
    // using app.settings['view options'].layout = false
    if ((app.set('view options') || {}).layout === false) {
        baseLayout = false;
    }

    this.controllerName = name;
    this.controllerFile = Controller.index[name];

    if (!this.controllerFile) {
        throw new Error('Controller ' + name + ' is not defined');
    }

    // import outer context
    if (Controller.context[name]) {
        Object.keys(Controller.context[name]).forEach(function (key) {
            this[key] = Controller.context[name][key];
        }.bind(this));
    }

    this.__dirname = app.root;

    /**
     * Define action
     * @param name String - optional (if missed, named function required as first param)
     * @param action Funcion - required, should be named function if first arg missed
     *
     */
    this.action = function (name, action) {
        if (typeof name === 'function') {
            action = name;
            name = action.name;
            if (!name) {
                throw new Error('Named function required when `name` param omitted');
            }
        }
        action.isAction = true;
        action.customName = name;
        actions[name] = action;
    };

    this.toString = function () {
        return 'Controller ' + this.controllerName;
    };

    this.respondTo = function (name) {
        return typeof actions[name] == 'function';
    };

    this.before = this.beforeFilter = function (f, params) {
        beforeFilters.push(filter(arguments));
    };

    this.prependBefore = this.prependBeforeFilter = function (f, params) {
        beforeFilters.unshift(filter(arguments));
    };

    this.after = this.afterFilter = function (f, params) {
        afterFilters.push(filter(arguments));
    };

    this.prependAfter = this.prependAfterFilter = function (f, params) {
        afterFilters.unshift(filter(arguments));
    };

    /*
     * Need to store name of filter to be able to skip it
     */
    function filter(args) {
        if (typeof args[0] === 'string' && typeof args[1] === 'function') {
            // change order
            args[1].customName = args[0];
            return [args[1], args[2], args[0]];
        } else {
            // normal order
            args[0].customName = args[0].name;
            return [args[0], args[1], args[0].name];
        }
    }

    this.skipBeforeFilter = function (name, only) {
        beforeFilters.forEach(function (filter, i) {
            if (filter[0] && filter[0].customName && name === filter[0].customName) {
                skipFilter(beforeFilters, i, only ? only.only : null);
            }
        });
    };

    this.skipAfterFilter = function (name, only) {
        afterFilters.forEach(function (filter, i) {
            if (filter[0] && filter[0].customName && name === filter[0].customName) {
                skipFilter(afterFilters, i, only ? only.only : null);
            }
        });
    };

    function skipFilter(filters, index, only) {
        if (!only) {
            delete filters[index];
        } else if (filters[index][1]) {
            if (!filters[index][1].except) {
                filters[index][1].except = [];
            } else if (typeof filters[index][1].except === 'string') {
                filters[index][1].except = [filters[index][1].except];
            }
            if (typeof only === 'string') {
                filters[index][1].except.push(only);
            } else if (only && only.forEach) {
                only.forEach(function (name) {
                    filters[index][1].except.push(name);
                });
            }
        }
    }

    this.layout = function (l) {
        if (typeof l !== 'undefined') {
            layout = l;
        }
        return layout ? layout + '_layout' : null;
    };

    var filterParams = ['password'];
    Controller.prototype.filterParameterLogging = function (args) {
        filterParams = filterParams.concat(Array.prototype.slice.call(arguments));
    };

    if (!IS_NODE_04) {
        this.__defineGetter__('response',  function () { return this.ctx.res }.bind(this));
        this.__defineGetter__('res',       function () { return this.ctx.res }.bind(this));
        this.__defineGetter__('request',   function () { return this.ctx.req }.bind(this));
        this.__defineGetter__('req',       function () { return this.ctx.req }.bind(this));
        this.__defineGetter__('session',   function () { return this.ctx.req.session }.bind(this));
        this.__defineGetter__('params',    function () { return this.ctx.req.params }.bind(this));
        this.__defineGetter__('body',      function () { return this.ctx.req.body }.bind(this));
        this.__defineGetter__('next',      function () { return this.ctx.next }.bind(this));
        this.__defineGetter__('actionName',function () { return this.ctx.action }.bind(this));
        this.__defineGetter__('path_to',   function () { return this.ctx.paths }.bind(this));
    }

    this.t = T();
    this.t.locale = app.settings.defaultLocale || 'en';
    this.T = T;

    if (process.cov && !this.__cov) {
        this.__cov = __cov;
    }

    this.perform = function (actionName, req, res) {
        res.info = {
            controller: this.controllerName,
            action: actionName,
            startTime: Date.now()
        };
        res.actionHistory = [];
        if (!this.initialized) {
            this.initialized = true;
            if (IS_NODE_04) {
                this.actionName = actionName;
                this.request = this.req = req;
                this.request.sandbox = {};
                this.response = this.res = res;
                this.params = req.params;
                this.session = res.session;
                this.body = req.body;
                this.next = next;
                this.path_to = Controller.getPathTo(actionName, req, res);
            }
            this.init();
        }

        var ctl = this, timeStart = false, prevMethod;

        this.ctx = {
            req: req,
            res: res,
            next: next,
            action: actionName,
            paths: Controller.getPathTo(actionName, req, res)
        };

        req.sandbox = {};

        log('');
        log($((new Date).toString()).yellow + ' ' + $(this.id).bold);
        log($(req.method).bold, $(req.url).grey, 'controller:', $(this.controllerName).green, 'action:', $(this.actionName).blue);

        if (Object.keys(req.query).length) {
            log($('Query: ').bold + JSON.stringify(req.query));
        }
        if (req.body && req.method !== 'GET') {
            var filteredBody = {};
            Object.keys(req.body).forEach(function (param) {
                if (!filterParams.some(function (filter) {return param.search(filter) !== -1;})) {
                    filteredBody[param] = req.body[param];
                } else {
                    filteredBody[param] = '[FILTERED]';
                }
            });
            log($('Body:  ').bold + JSON.stringify(filteredBody));
        }

        var queue = [];

        enqueue(beforeFilters, queue);
        queue.push(getCaller(actions[actionName]));
        enqueue(afterFilters, queue);

        if (app.disabled('model cache')) {
            // queue.push(getCaller(app.disconnectSchemas));
        }
        if (app.enabled('eval cache')) {
            queue.push(getCaller(function () {
                backToPool(ctl);
            }));
        }

        next();

        var logActions = app.enabled('log actions');

        function next() {

            if (logActions && timeStart && prevMethod) {
                log('<<< ' + prevMethod.customName + ' [' + (Date.now() - timeStart) + ' ms]');
            }

            if (timeStart && prevMethod) {
                res.actionHistory.push({name: prevMethod.customName, time: Date.now() - timeStart});
            }

            // run next method in queue (if any callable method)
            var method = queue.shift();
            if (typeof method == 'function') {
                process.nextTick(function () {
                    method.call(ctl.request.sandbox, next);
                });
            } else {
                res.info.appTime = Date.now() - res.info.startTime;
            }
        }

        function getCaller(method) {
            if (!method) {
                throw new Error('Undefined action');
            }

            return function (next) {
                req.inAction = method.isAction;
                if (logActions && method.customName) {
                    if (method.isAction) {
                        log('>>> perform ' + $(method.customName).bold.blue);
                    } else {
                        log('>>> perform ' + $(method.customName).bold.grey);
                    }
                }
                timeStart = Date.now();
                prevMethod = method;
                method.call(this, next);
            }
        }

        function enqueue(collection, queue) {
            collection.forEach(function (f) {
                var params = f[1];
                if (!params) {
                    enqueue();
                } else if (params.only && params.only.indexOf(actionName) !== -1 && (!params.except || params.except.indexOf(actionName) === -1)) {
                    enqueue();
                } else if (params.except && params.except.indexOf(actionName) === -1) {
                    enqueue();
                }
                function enqueue() { queue.push(getCaller(f[0])); }
            });
        }
    };

    this.setLocale = function (locale) {
        this.t.locale = T.localeSupported(locale) ? locale : app.settings.defaultLocale;
    };

    this.getLocale = function () {
        return this.t.locale;
    };

    this.load = function (controller) {
        runCode(Controller.index[controller], this);
    }.bind(this);

    var buffer = {};
    this.publish = this.export = function (name, obj) {
        if (typeof name !== 'function' && typeof name.name === 'string') {
            obj = name;
            name = obj.name;
        }
        buffer[name] = obj;
    };

    this.use = this.import = function (name) {
        return buffer[name];
    };

    this.init = function () {
        // reset scope variables
        actions = {};
        beforeFilters = [];
        afterFilters = [];
        buffer = {};
        layout = baseLayout;

        // publish models
        if (app.models) {
            Object.keys(app.models).forEach(function (className) {
                this[className] = app.models[className];
            }.bind(this));
        }

        Object.keys(Controller.prototype).forEach(function (method) {
            this[method] = Controller.prototype[method];
        }.bind(this));

        runCode(this.controllerFile, this);
    };

}

Controller.prototype.send = function (x) {
    log('Send to client: ' + x);
    this.response.send.apply(this.response, Array.prototype.slice.call(arguments));
    if (this.request.inAction) this.next();
};

Controller.prototype.redirect = function (path) {
    log('Redirected to', $(path).grey);
    this.response.redirect(path.toString());
    if (this.request.inAction) this.next();
};

Controller.prototype.render = function (arg1, arg2) {
    var view, params;
    if (typeof arg1 == 'string') {
        view = arg1;
        params = arg2;
    } else {
        // console.log(params);
        view = this.actionName;
        params = arg1;
    }
    params = params || {};
    params.controllerName = params.controllerName || this.controllerName;
    params.actionName = params.actionName || this.actionName;
    params.path_to = this.path_to;
    params.request = this.request;
    params.t = this.t;
    var layout = this.layout(),
        file = this.controllerName + '/' + view;

    if (this.response.renderCalled) {
        log('Rendering', $(file).grey, 'using layout', $(layout).grey, 'called twice.', $('render() can be called only once!').red);
        return;
    }

    try {
        var helper = require(app.root + '/app/helpers/' + this.controllerName + '_helper');
    } catch (e) {
        helper = {};
    }

    log('Rendering', $(file).grey, 'using layout', $(layout).grey);

    var helpers = railway.helpers.personalize(this);

    this.response.renderCalled = true;
    this.response.render(file, {
        locals: safe_merge(params, this.request.sandbox, this.path_to, helpers, helpers.__proto__, helper),
        layout: layout ? 'layouts/' + layout : false,
        debug:  false
    });
    if (this.request.inAction) this.next();
};

Controller.prototype.flash = function () {
    this.request.flash.apply(this.request, Array.prototype.slice.call(arguments));
};

var pool = {};
function backToPool(ctl) {
    pool[ctl.controllerName].push(ctl);
}
exports.load = function (name) {
    if (app.disabled('eval cache')) {
        return new Controller(name);
    } else {
        if (!pool[name]) pool[name] = [];
        var ctl = pool[name].shift();
        if (!ctl) {
            // console.log('new controller');
            ctl = new Controller(name);
        }
        return ctl;
    }
};

Controller.getPathTo = function (actionName, req, res) {
    return railway.routeMapper.pathTo;
};

exports.addBasePath = function (basePath, prefix, context) {
    prefix = prefix || '';
    if (path.existsSync(basePath)) {
        fs.readdirSync(basePath).forEach(function (file) {
            var stat = fs.statSync(path.join(basePath, file));
            if (stat.isFile()) {
                var m = file.match(/(.*?)_controller\.(js|coffee)$/);
                if (m) {
                    var ctl = prefix + m[1];
                    Controller.index[ctl] = Controller.index[ctl] || path.join(basePath, file);
                    Controller.context[ctl] = Controller.context[ctl] || context;
                }
            } else if (stat.isDirectory()) {
                exports.addBasePath(path.join(basePath, file), prefix + file + '/');
            }
        });
    }
};

exports.Controller = Controller;

exports.init = function () {
    cache = {};
    Controller.index = {};
    Controller.context = {};
    exports.addBasePath(app.root + '/app/controllers');
};

/**
 * CSRF Protection Section
 */
Controller.prototype.protectFromForgery = function (secret, paramName) {
    var req = this.request;

    if (!req.session) {
        return this.next();
    }

    if (!req.session.csrfToken) {
        req.session.csrfToken = Math.random();
        req.csrfParam = paramName || 'authenticity_token';
        req.csrfToken = sign(req.session.csrfToken);
        return this.next();
    }

    // publish secure credentials
    req.csrfParam = paramName || 'authenticity_token';
    req.csrfToken = sign(req.session.csrfToken);

    if (req.originalMethod == 'POST') {
        var token = req.param('authenticity_token');
        if (!token || token !== sign(req.session.csrfToken)) {
            railway.logger.write('Incorrect authenticity token');
            this.send(403);
        } else {
            this.next();
        }
    } else {
        this.next();
    }

    function sign(n) {
        return require('crypto').createHash('sha1').update(n.toString()).update(secret.toString()).digest('hex');
    }
};

Controller.prototype.protectedFromForgery = function () {
    return this.request.csrfToken && this.request.csrfParam;
};
