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

/**
 * Controller encapsulates http request handling layer. It allows to 
 * render response, redirect, and tons of other related stuff.
 *
 * Instance of controller is actual response handler, it's not a 
 * like in RoR, you can not inherit controllers, just load, mix.
 *
 * Inheritance in controllers is bad idea.
 *
 * @param {String} name - name of controller
 */
function Controller(name, root) {
    var self = this;
    this.id = ++id;
    this._beforeFilters = [];
    this._afterFilters = [];
    this._actions = {};
    this._layout = null;
    this._buffer = {};

    ctlParams[this.id] = {};

    this.root = this.__dirname = root || app.root;

    if (!layoutsCache[name]) {
        // TODO: what if view engine name differs from extension?
        layoutsCache[name] = railway.utils.existsSync(app.root + '/app/views/layouts/' + name + '_layout.' + app.settings['view engine']) ? name : 'application';
    }

    ctlParams[this.id].baseLayout =
    ctlParams[this.id].layout = layoutsCache[name];

    // allow to disable layout by default for all views
    // using app.settings['view options'].layout = false
    if ((app.set('view options') || {}).layout === false) {
        ctlParams[this.id].baseLayout = false;
    }

    this.controllerName = name;
    this.controllerFile = Controller.index[this.root][name];

    if (!this.controllerFile) {
        throw new Error('Controller ' + name + ' is not defined');
    }

    // import outer context
    var outerContext = Controller.context[this.root][name];
    if (outerContext) {
        Object.keys(outerContext).forEach(function (key) {
            self[key] = outerContext[key].bind(self);
        });
    }

    // fix object inheritance broken when using as context
    Object.keys(Controller.prototype).forEach(function (method) {
        self[method] = Controller.prototype[method].bind(self);
    });

    this._filterParams = ['password'];

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

    this.t = T();
    this.t.locale = app.settings.defaultLocale || 'en';
    this.T = T;

    if (global.__cov && !this.__cov) {
        this.__cov = global.__cov;
    }

}

/**
 * Initialize controller (called on first request)
 * @private
 */
Controller.prototype._init = function initializeController() {
    // reset scope variables
    this._actions = {};
    this._beforeFilters = [];
    this._afterFilters = [];
    this._buffer = {};
    ctlParams[this.id].layout = ctlParams[this.id].baseLayout;

    // publish models
    if (app.models) {
        Object.keys(app.models).forEach(function (className) {
            this[className] = app.models[className];
        }.bind(this));
    }

    runCode(this.controllerFile, this);
};

/**
 * Internal request handler. Serves request using railway env:
 *
 * - update context links: req, res, next and other req-sensitive stuff
 * - run before filters
 * - run action
 * - run after filters
 *
 * `perform` method called by `ControllerBridge`
 *
 * @param {String} actionName
 * @param {IncomingMessage} req - incoming http request
 * @param {ServerResponse} res - http server response
 * @private
 */
Controller.prototype.perform = function (actionName, req, res, nextRoute) {
    res.info = {
        controller: this.controllerName,
        action: actionName,
        startTime: Date.now()
    };
    res.actionHistory = [];
    if (!this.initialized) {
        this.initialized = true;
        this._init();
    }

    var ctl = this, timeStart = false, prevMethod;

    // need to track uniqueness of filters by name
    var queueIndex = {};

    this.ctx = {
        req: req,
        res: res,
        next: next,
        action: actionName,
        paths: Controller.getPathTo(actionName)
    };

    req.sandbox = {};

    if (req.query && Object.keys(req.query).length) {
        log($('Query: ').bold + JSON.stringify(req.query));
    }
    if (req.body && req.method !== 'GET') {
        var filteredBody = {};
        Object.keys(req.body).forEach(function (param) {
            if (!ctl._filterParams.some(function (filter) {return param.search(filter) !== -1;})) {
                filteredBody[param] = req.body[param];
            } else {
                filteredBody[param] = '[FILTERED]';
            }
        });
        log($('Body:  ').bold + JSON.stringify(filteredBody));
    }

    // build queue using before-, after- filters and action
    var queue = [];

    enqueue(this._beforeFilters, queue);
    queue.push(getCaller(this._actions[actionName]));
    enqueue(this._afterFilters, queue);

    if (app.disabled('model cache')) {
        // queue.push(getCaller(app.disconnectSchemas));
    }
    if (app.enabled('eval cache')) {
        queue.push(getCaller(function () {
            backToPool(ctl);
        }));
    }

    // start serving request
    next();

    var logActions = app.enabled('log actions');

    function next(err) {

        if (logActions && timeStart && prevMethod) {
            log('<<< ' + prevMethod.customName + ' [' + (Date.now() - timeStart) + ' ms]');
        }

        if (err && err.constructor.name === 'Error') {
            return nextRoute(err);
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
                    log('>>> perform ' + $(method.customName).bold.cyan);
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
            function enqueue() {
                if (f[2]) {
                    if (queueIndex[f[2]]) return;
                    queueIndex[f[2]] = true;
                }
                queue.push(getCaller(f[0]));
            }
        });
    }
};

/**
 * Set current locale. This setting will affect all views locale-specific helpers.
 *
 * @param locale
 */
Controller.prototype.setLocale = function (locale) {
    this.t.locale = T.localeSupported(locale) ? locale : app.settings.defaultLocale;
};

/**
 * Get current locale
 *
 * @returns {String} locale name
 */
Controller.prototype.getLocale = function () {
    return this.t.locale;
};

var pool = {};
function backToPool(ctl) {
    pool[ctl.root][ctl.controllerName].push(ctl);
}
exports.load = function (name, root) {
    if (app.disabled('eval cache')) {
        return new Controller(name, root);
    } else {
        if (!pool[root]) pool[root] = {};
        if (!pool[root][name]) pool[root][name] = [];
        var ctl = pool[root][name].shift();
        if (!ctl) {
            ctl = new Controller(name, root);
        }
        return ctl;
    }
};
exports.loadNew = function (name, root) {
    if (app.disabled('eval cache')) {
        return CommonjsController.load(name, root);
    } else {
        if (!pool[root]) pool[root] = {};
        if (!pool[root][name]) pool[root][name] = [];
        var ctl = pool[root][name].shift();
        if (!ctl) {
            ctl = CommonjsController.load(name, root);
        }
        return ctl;
    }
};

exports.loadAll = function (root) {
    Object.getOwnPropertyNames(Controller.index[root || app.root]).forEach(function(c) {
        exports.load(c, root)._init();
    });
};

/**
 * @private
 */
Controller.getPathTo = function () {
    return railway.routeMapper.pathTo;
};

/**
 * Add custom base controller dir to railway pool. It allows you to build
 * extensions with your own controllers, and build app
 * breaken by modules
 *
 * @param {String} basePath
 * @param {String} prefix
 * @param {Object} context - controller context tweaks, all members of
 * this object will be accesible in controller
 *
 * @public railway.controller.addBasePath
 */
function addBasePath(basePath, prefix, context, root) {
    prefix = prefix || '';
    if (!railway.utils.existsSync(basePath)) return;

    root = root || app.root;

    Controller.index[root] = Controller.index[root] || {};
    Controller.context[root] = Controller.context[root] || {};

    fs.readdirSync(basePath).forEach(addContoller);

    function addContoller(file) {
        var stat = fs.statSync(path.join(basePath, file));
        if (stat.isFile()) {
            var m = file.match(/(.*?)_?[cC]ontroller\.(js|coffee)$/);
            if (m) {
                var ctl = prefix + m[1];
                Controller.index[root][ctl] = Controller.index[root][ctl] || path.join(basePath, file);
                Controller.context[root][ctl] = Controller.context[root][ctl] || context;
            }
        } else if (stat.isDirectory()) {
            exports.addBasePath(path.join(basePath, file), prefix + file + '/', context, root);
        }
    }
};

exports.init = function (root) {
    cache = {};
    CommonjsController.index = Controller.index = Controller.index || {};
    Controller.aliases = Controller.aliases || {};
    Controller.context = Controller.context || {};
    exports.addBasePath(root + '/app/controllers', null, null, root);
};

