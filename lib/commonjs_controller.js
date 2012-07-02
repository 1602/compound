module.exports = Controller;

Controller.beforeFilters = [];
Controller.afterFilters = [];
Controller.actions = {};
Controller.layout = null;
Controller.buffer = {};
Controller.filterParams = [ 'password' ];

function Controller(req, res) {
    this.controllerName = this.constructor.controllerName;
    var root = this.constructor.root;
    this.root = root;
    this._layout = this.constructor.layout || 'application';

    try {
        this._helper = require(root + '/app/helpers/' + this.controllerName + '_helper');
    } catch (e) {
        this._helper = {};
    }

    try {
        this._appHelper = require(root + '/app/helpers/application_helper');
    } catch (e) {
        this._appHelper = {};
    }

}

/**
 * Configure which query params should be filtered from logging
 * @param {String} param 1 name
 * @param {String} param 2 name
 * @param ...
 * @param {String} param n name
 */
Controller.filterParameterLogging = function (args) {
    this.filterParams = this.filterParams.concat(Array.prototype.slice.call(arguments));
};

Controller.load = function (name, root) {
    root = root || app.root;
    var file = Controller.index[root][name];
    var Ctl = require(file);
    Ctl.root = root;
    Ctl.controllerName = name;
    Ctl.controllerFile = file;
    return Ctl;
};

/**
 * Define controller action
 *
 * @param name String - optional (if missed, named function required as first param)
 * @param action Function - required, should be named function if first arg missed
 *
 * @example
 * ```
 * BlogController.action(function index() {
 *     Post.all(function (err, posts) {
 *         this.render({posts: posts});
 *     }.bind(this));
 * });
 * ```
 *
 */
Controller.action = function (name, action) {
    if (typeof name === 'function') {
        action = name;
        name = action.name;
        if (!name) {
            throw new Error('Named function required when `name` param omitted');
        }
    }
    action.isAction = true;
    action.customName = name;
    this.actions[name] = action;
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
        this._layout = l;
    }
    return this._layout ? this._layout + '_layout' : null;
};

/**
 * Render response.
 *
 * @param {String} view name [optional]
 * @param {Object} locals - data passed to view as local variables [optional]
 *
 * When first parameter is omitted action name used as view name:
 * ```
 * BlogController.action(function index() {
 *     this.render(); // will render 'index' action of current controller
 * });
 * ```
 *
 * Second argument is optional too, you can set local variables using `this` inside
 * action:
 * ```
 * BlogController.action('new', function () {
 *     this.title = 'Create new post';
 *     this.post = new Post;
 *     this.render();
 * });
 * ```
 * will result the same as
 * ```
 * BlogController.action('new', function () {
 *     this.render({
 *         title: 'Create new post',
 *         post: new Post
 *     });
 * });
 * ```
 */
Controller.prototype.render = function (arg1, arg2) {
    var view, params;
    var ctlName = this.controllerName;
    var root = this.root;
    if (typeof arg1 == 'string') {
        view = arg1;
        params = arg2;
    } else {
        view = this.actionName;
        params = arg1;
    }
    params = params || {};

    var layout = this.layout(),
        file = ctlName + '/' + view;

    if (this.res.renderCalled) {
        log('Rendering', $(file).grey, 'using layout', $(layout).grey, 'called more than once.', $('render() can be called only once!').red);
        return;
    }

    log('Rendering', $(file).grey, 'using layout', $(layout).grey);

    var helpers = railway.helpers.personalize(this);

    app.set('views', this.root + '/app/views');
    this.res.renderCalled = true;
    this.res.render(file, {
        locals: safe_merge(params, this, helpers, helpers.__proto__, this._helper, this._appHelper),
        layout: layout ? 'layouts/' + layout : false,
        debug:  false
    });
    if (this.req.inAction) this.next();
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
Controller.prototype.perform = function perform(actionName, req, res, nextRoute) {
    var self = this;
    res.info = {
        controller: this.controllerName,
        action: actionName,
        startTime: Date.now()
    };

    this.request = this.req = req;
    this.response = this.res = res;
    this.nextRoute = this.next = nextRoute;

    res.actionHistory = [];
    if (!this.initialized) {
        this.initialized = true;
        this._init();
    }

    this.actionName = actionName;

    var ctl = this, timeStart = false, prevMethod;

    // need to track uniqueness of filters by name
    var queueIndex = {};

    log('');
    log($((new Date).toString()).yellow + ' ' + $(this.id).bold);
    log($(req.method).bold, $(req.url).grey, 'controller:', $(this.controllerName).cyan, 'action:', $(this.actionName).blue);

    if (req.query && Object.keys(req.query).length) {
        log($('Query: ').bold + JSON.stringify(req.query));
    }
    if (req.body && req.method !== 'GET') {
        var filteredBody = {};
        Object.keys(req.body).forEach(function (param) {
            if (!ctl.constructor.filterParams.some(function (filter) {return param.search(filter) !== -1;})) {
                filteredBody[param] = req.body[param];
            } else {
                filteredBody[param] = '[FILTERED]';
            }
        });
        log($('Body:  ').bold + JSON.stringify(filteredBody));
    }

    // build queue using before-, after- filters and action
    var queue = [];

    enqueue(this.constructor.beforeFilters, queue);
    queue.push(getCaller(this.constructor.actions[actionName]));
    enqueue(this.constructor.afterFilters, queue);

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
            return self.nextRoute(err);
        }

        if (timeStart && prevMethod) {
            res.actionHistory.push({name: prevMethod.customName, time: Date.now() - timeStart});
        }

        // run next method in queue (if any callable method)
        var method = queue.shift();
        if (typeof method == 'function') {
            process.nextTick(function () {
                method.call(ctl, next);
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

