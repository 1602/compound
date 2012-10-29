
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
Controller.prototype.render = function (arg1, arg2) {
    var railway = this.railway;
    var app = railway.app;
    var res = this.res;
    var self = this;
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
    params.pathTo = railway.routeMapper.pathTo;
    params.request = this.req;
    params.params = this.params;
    params.t = this.t;

    var layout = this.layout(),
        file = this.controllerName + '/' + view;

    var helper = railway.structure.helpers[this.controllerName + '_helper'] || {};
    var appHelper = railway.structure.helpers.application_helper;

    log('Rendering', $(file).grey, 'using layout', $(layout).grey);

    var helpers = railway.helpers.personalize(this);

    var locals = safeMerge(params, this.locals, helpers, helpers.__proto__, helper, appHelper);

    locals.partial = function (file, params) {
        if (file.match(/.ejs$/)) file = file.replace('.ejs', '');
        var fn = railway.structure.views[file];
        if (!fn) fn = railway.structure.views[file.replace(/\//, '/_')];
        return fn(safeMerge(params.locals, locals));
    };

    ensureFlash(this.req);

    res.renderCalled = true;
    var renderParams = {locals: locals};

    layout = layout ? 'layouts/' + layout : false;

    if (layout) {
        var html = render(file, locals, false);
        if (html) {
            locals.body = html;
            render(layout, locals, true);
        }
    } else {
        render(file, locals, true);
    }

    function render(file, params, send) {
        try {
            var html = railway.structure.views[file](params);
        } catch (e) {
            self.next(e);
            return false;
        }
        if (send) {
            res.send(html);
            if (self.context.inAction) {
                self.next();
            }
        } else {
            return html;
        }
    }

};

function ensureFlash(req) {
    if (req.flash) {
        return;
    }
    req.flash = function _flash(type, msg) {
        if (this.session === undefined) throw Error('req.flash() requires sessions');
        var msgs = this.session.flash = this.session.flash || {};
        if (type && msg) {
            // util.format is available in Node.js 0.6+
            // if (arguments.length > 2 && format) {
                // var args = Array.prototype.slice.call(arguments, 1);
                // msg = format.apply(undefined, args);
            // }
            return (msgs[type] = msgs[type] || []).push(msg);
        } else if (type) {
            var arr = msgs[type];
            delete msgs[type];
            return arr || [];
        } else {
            this.session.flash = {};
            return msgs;
        }
    }
}

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
    var railway = this.railway;
    if (typeof l !== 'undefined') {
        this.constructor.layout = l;
    }
    if (typeof this.constructor.layout === 'undefined') {
        this.constructor.layout = railway.structure.views.hasOwnProperty('layouts/' + this.controllerName + '_layout') ? this.controllerName : 'application';
    }
    return this.constructor.layout ? this.constructor.layout + '_layout' : null;
};

Controller.prototype.load = function (controllerName) {
    this.build(this.railway.structure.controllers[controllerName + '_controller']);
};

Controller.prototype.t = function () {
    if (!this._t) {
        this._t = this.railway.T();
        this._t.locale = this.app.settings.defaultLocale || 'en';
        this._T = this.railway.T;
    }
    return this._t.apply(this, [].slice.call(arguments));

}

module.exports = Controller.prototype;

