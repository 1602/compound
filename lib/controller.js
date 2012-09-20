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

var ctlParams = {};

var id = 0;

var CommonjsController = require('./commonjs_controller');

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

    if (global.__cov && !this.__cov) {
        this.__cov = global.__cov;
    }

}

/**
 * Publish some object or function to use in another controller
 */
Controller.prototype.publish = function (name, obj) {
    if (typeof name === 'function') {
        obj = name;
        this._buffer[obj.name] = obj;
    } else if (typeof name === 'string') {
        this._buffer[name] = obj;
    }
};

/**
 * Get some object or function published in another controller
 */
Controller.prototype.use = function (name) {
    var what = this._buffer[name];
    if (typeof what === 'undefined') throw new Error(name + ' is not defined');
    return what;
};

/**
 * Configure which query params should be filtered from logging
 * @param {String} param 1 name
 * @param {String} param 2 name
 * @param ...
 * @param {String} param n name
 */
Controller.prototype.filterParameterLogging = function (args) {
    this._filterParams = this._filterParams.concat(Array.prototype.slice.call(arguments));
};


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
 * @param {String} name - name of filter to skip
 * @param {Array} or {String} only - choose actions to skip filter
 */
Controller.prototype.skipBeforeFilter = function (name, only) {
    this._beforeFilters.forEach(function (filter, i) {
        if (filter[0] && filter[0].customName && name === filter[0].customName) {
            skipFilter(this._beforeFilters, i, only ? only.only : null);
        }
    }.bind(this));
};

/**
 * @param {String} name - name of filter to skip
 * @param {Array} or {String} only - choose actions to skip filter
 */
Controller.prototype.skipAfterFilter = function (name, only) {
    this._afterFilters.forEach(function (filter, i) {
        if (filter[0] && filter[0].customName && name === filter[0].customName) {
            skipFilter(this._afterFilters, i, only ? only.only : null);
        }
    }.bind(this));
};

/**
 * @param {Array} filters collection
 * @param {Number} index of filter to skip
 * @param {Array} or {String} only - choose actions to skip filter
 * @private
 */
function skipFilter(filters, index, only) {
    if (!only) {
        delete filters[index];
    } else if (filters[index][0]) {
        if (!filters[index][1]) {
            filters[index][1] = {except: []};
        }
        if (!filters[index][1].except) {
            filters[index][1].except = [];
        } else if (typeof filters[index][1].except === 'string') {
            filters[index][1].except = [filters[index][1].except];
        }
        if (typeof only === 'string') {
            filters[index][1].except.push(only);
        } else if (only && only.constructor.name === 'Array') {
            only.forEach(function (name) {
                filters[index][1].except.push(name);
            });
        }
    }
}

/**
 * Define controller action
 *
 * @param name String - optional (if missed, named function required as first param)
 * @param action Funcion - required, should be named function if first arg missed
 *
 * @example
 * ```
 * action(function index() {
 *     Post.all(function (err, posts) {
 *         render({posts: posts});
 *     });
 * });
 * ```
 *
 */
Controller.prototype.action = function (name, action) {
    if (typeof name === 'function') {
        action = name;
        name = action.name;
        if (!name) {
            throw new Error('Named function required when `name` param omitted');
        }
    }
    action.isAction = true;
    action.customName = name;
    this._actions[name] = action;
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
        if (IS_NODE_04) {
            this.actionName = actionName;
            this.request = this.req = req;
            this.request.sandbox = {};
            this.response = this.res = res;
            this.params = req.params;
            this.session = res.session;
            this.body = req.body;
            this.next = next;
            this.path_to = Controller.getPathTo(actionName);
        }
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

    log('');
    log($((new Date).toString()).yellow + ' ' + $(this.id).bold);
    log($(req.method).bold, $(req.url).grey, 'controller:', $(this.controllerName).cyan, 'action:', $(this.actionName).blue);

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
 * Layout setter/getter
 *
 * - when called without arguments, used as getter,
 * - when called with string, used as setter
 *
 * When `layout` not called controller trying to get guess which layout to use.
 * First of all controller looking for layout with the same name as controller,
 * for example `users_controller` will choose `users_laout`, if there's no 
 * layout with this name, controller using `application_layout`.
 *
 * If you do not want to use any layout by default, you can just set it up:
 *
 *     app.set('view options', {layout: false});
 *
 * this will prevent you from repeating `layout(false)` in each controller where
 * you do not want to use layout, for example in api controllers.
 *
 * - choose 
 *
 * @param {String} layout - [optional] layout name
 */
Controller.prototype.layout = function layout(l) {
    if (typeof l !== 'undefined') {
        ctlParams[this.id].layout = l;
    }
    return ctlParams[this.id].layout ? ctlParams[this.id].layout + '_layout' : null;
};

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

/**
 * Schedule before filter to the end of queue. This method can be called
 * with named function as single param, or with two params: name and 
 * anonimous function
 *
 * Examples:
 * ```
 * before('some named filter', function () {});
 * before(function namedMethod() {});
 * ```
 *
 * This filters can be skipped using this names in future. Examples:
 * ```
 * skipBeforeFilter('some named filter');
 * skipBeforeFilter('namedMethod');
 * ```
 *
 * Please note, that every named filter only can be scheduled once:
 * ```
 * before(function myMethod() {
 *     // some code
 * });
 * before(function myMethod() {
 *     // another code
 * });
 * ```
 * This will only schedule first method!
 *
 * @alias beforeFilter
 * @param {Funcion} f
 * @param {Object} params
 */
Controller.prototype.before = function before(f, params) {
    this._beforeFilters.push(filter(arguments));
};
Controller.prototype.beforeFilter = Controller.prototype.before;

/**
 * Schedule before filter to the start of queue. This method can be called
 * with named function as single param, or with two params: name and 
 * anonimous function.
 *
 * @alias prependBeforeFilter
 * @param {Funcion} f
 * @param {Object} params
 */
Controller.prototype.prependBefore = function prependBefore(f, params) {
    this._beforeFilters.unshift(filter(arguments));
};
Controller.prototype.prependBeforeFilter = Controller.prototype.prependBefore;

/**
 * @override default controller string representation
 */
Controller.prototype.toString = function toString() {
    return 'Controller ' + this.controllerName;
};

/**
 * @param {String} name - name of action
 * @returns whether controller responds to action
 */
Controller.prototype.respondTo = function respondTo(name) {
    return typeof this._actions[name] == 'function';
};

/**
 * Append after filter to the end of queue. This method can be called
 * with named function as single param, or with two params: name and 
 * anonimous function.
 *
 * @param {Function} f
 * @param {Object} params
 */
Controller.prototype.after = function after(f, params) {
    this._afterFilters.push(filter(arguments));
};
Controller.prototype.afterFilter = Controller.prototype.after;

/**
 * Prepend after filter to the start of queue. This method can be called
 * with named function as single param, or with two params: name and 
 * anonimous function.
 *
 * @param {Function} f
 * @param {Object} params
 */
Controller.prototype.prependAfter = function prependAfter(f, params) {
    this._afterFilters.unshift(filter(arguments));
};
Controller.prototype.prependAfterFilter = Controller.prototype.prependAfter;

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

/**
 * Load another controller code in this context
 *
 * @param {String} controller - name of controller (without _controller suffix)
 */
Controller.prototype.load = function (controller, alias) {
    var root = Controller.aliases[alias] || this.root;
    var ctl = Controller.index[root][controller];
    if (!ctl) {
        throw new Error('Controller ' + controller + ' is not defined. Please note that namespaced controllers names should include namespace when loading');
    }
    runCode(ctl, this);
};

/**
 * Send response, as described in ExpressJS guide:
 *
 * This method is a high level response utility allowing you
 * to pass objects to respond with json, strings for html,
 * Buffer instances, or numbers representing the status code.
 * The following are all valid uses:
 * ```
 * send(); // 204
 * send(new Buffer('wahoo'));
 * send({ some: 'json' });
 * send('&lt;p>some html&lt;/p>');
 * send('Sorry, cant find that', 404);
 * send('text', { 'Content-Type': 'text/plain' }, 201);
 * send(404);
 * ```
 *
 */
Controller.prototype.send = function (x) {
    log('Send to client: ' + x);
    this.response.send.apply(this.response, Array.prototype.slice.call(arguments));
    if (this.request.inAction) this.next();
};

/**
 * Set or get response header
 *
 * @param {String} key - name of header
 * @param {String} val - value of header (optional)
 *
 * When second argument is omitted method acts as getter.
 *
 * Example:
 * ```
 * header('Content-Length');
 * // => undefined
 *
 * header('Content-Length', 123);
 * // => 123
 * 
 * header('Content-Length');
 * // => 123
 * ```
 */
Controller.prototype.header = function (key, val) {
    return this.response.header.call(this.response, key, val);
};

/**
 * Redirect to `path`
 */
Controller.prototype.redirect = function (path) {
    log('Redirected to', $(path).grey);
    this.response.redirect(path.toString());
    if (this.request.inAction) this.next();
};

/**
 * Render response.
 *
 * @param {String} view name [optional]
 * @param {Object} locals - data passed to view as local variables [optional]
 *
 * When first parameter is omitted action name used as view name:
 * ```
 * action(function index() {
 *     render(); // will render 'index' action of current controller
 * });
 * ```
 *
 * Second argument is optional too, you can set local variables using `this` inside
 * action:
 * ```
 * action('new', function () {
 *     this.title = 'Create new post';
 *     this.post = new Post;
 *     render();
 * });
 * ```
 * will result the same as
 * ```
 * action('new', function () {
 *     render({
 *         title: 'Create new post',
 *         post: new Post
 *     });
 * });
 * ```
 */
Controller.prototype.render = function (arg1, arg2, cb) {
    var view, params;
    if (typeof arg1 == 'string') {
        view = arg1;
        params = arg2;
    } else {
        view = this.actionName;
        params = arg1;
    }
    params = params || {};
    params.controllerName = params.controllerName || this.controllerName;
    params.actionName = params.actionName || this.actionName;
    params.path_to = this.path_to;
    params.request = this.request;
    params.params = this.request.params;
    params.t = this.t;
    var layout = this.layout(),
        file = this.controllerName + '/' + view;

    if (this.response.renderCalled) {
        log('Rendering', $(file).grey, 'using layout', $(layout).grey, 'called twice.', $('render() can be called only once!').red);
        return;
    }

    var helper;
    try {
        helper = require(this.root + '/app/helpers/' + this.controllerName + '_helper');
    } catch (e) {
        helper = {};
    }

    var appHelper;
    try {
        appHelper = require(this.root + '/app/helpers/application_helper');
    } catch (e) {
        appHelper = {};
    }

    log('Rendering', $(file).grey, 'using layout', $(layout).grey);

    var helpers = railway.helpers.personalize(this);

    app.set('views', this.root + '/app/views');
    this.response.renderCalled = true;
    this.response.render(file, {
        locals: safe_merge(params, this.request.sandbox, this.path_to, helpers, helpers.__proto__, helper, appHelper),
        layout: layout ? 'layouts/' + layout : false,
        debug:  false
    }, cb);
    if (this.request.inAction) this.next();
};

/**
 * Add flash error to display in next request
 *
 * @param {String} type
 * @param {String} message
 */
Controller.prototype.flash = function flash(type, message) {
    this.request.flash.apply(this.request, Array.prototype.slice.call(arguments));
};

/**
 * Respond to .:format
 * @param {Function} block
 *
 * Example (respond to json and html):
 *
 *     action(function index() {
 *         var fruits = this.fruits = ['apple', 'banana', 'kiwi'];
 *         respondTo(function (format) {
 *             format.html(render);
 *             format.json(function () {
 *                 send(fruits);
 *             });
 *         });
 *     });
 */
Controller.prototype.respondTo = function respondTo(block) {
    var f = this.request.params.format || 'html';
    block({
        html: function (c) {
            if (f === 'html') {
                c();
            }
        },
        json: function (c) {
            if (f === 'json') {
                c();
            }
        }
    });
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
exports.addBasePath = addBasePath;

exports.Controller = Controller;

exports.init = function (root) {
    cache = {};
    CommonjsController.index = Controller.index = Controller.index || {};
    Controller.aliases = Controller.aliases || {};
    Controller.context = Controller.context || {};
    exports.addBasePath(root + '/app/controllers', null, null, root);
};

/**
 * Enables CSRF Protection
 *
 * This filter will check `authenticity_token` param of POST request 
 * and compare with token calculated by session token and app-wide secret
 *
 * @param {String} secret
 * @param {String} paramName
 *
 * @example `app/controllers/application_controller.js`
 * ```
 * before('protect from forgery', function () {
 *     protectFromForgery('415858f8c3f63ba98546437f03b5a9a4ddea301f');
 * });
 * ```
 */
Controller.prototype.protectFromForgery = function protectFromForgery(secret, paramName) {
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

