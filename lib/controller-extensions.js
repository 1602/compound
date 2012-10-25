
var utils       = require('./railway_utils'),
    fs = require('fs'),
    path = require('path'),
    safeMerge  = utils.safe_merge,
    $           = utils.stylize.$,
    log         = utils.debug;

function Controller() {}

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
    params.path_to = railway.routeMapper.pathTo;
    params.request = this.req;
    params.params = this.params;
    params.t = this.t;

    var layout = this.layout(),
        file = this.controllerName + '/' + view;

    var helper = railway.structure.helpers[this.controllerName + '_helper'] || {};
    var appHelper = railway.structure.helpers.application_helper;

    log('Rendering', $(file).grey, 'using layout', $(layout).grey);

    var helpers = railway.helpers.personalize(this);

    app.set('views', app.root + '/app/views');

    var locals = safeMerge(params, this.locals, helpers, helpers.__proto__, helper, appHelper);

    this.res.renderCalled = true;
    this.res.render(file, {
        locals: locals,
        layout: layout ? 'layouts/' + layout : false,
        debug:  false
    }, cb);

    if (this.context.inAction) {
        this.next();
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
        this.constructor.layout = l;
    }
    if (typeof this.constructor.layout === 'undefined') {
        this.constructor.layout = railway.structure.views.hasOwnProperty('layouts/' + this.controllerName + '_layout') ? this.controllerName : 'application';
    }
    return this.constructor.layout ? this.constructor.layout + '_layout' : null;
};

Controller.prototype.load = function (controllerName) {
    this.build(railway.structure.controllers[controllerName + '_controller']);
};

Controller.prototype.t = function () {
    if (!this._t) {
        this._t = T();
        this._t.locale = app.settings.defaultLocale || 'en';
        this._T = T;
    }
    return this._t.apply(this, [].slice.call(arguments));

}

module.exports = Controller.prototype;

