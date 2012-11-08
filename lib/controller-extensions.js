
var utils = require('./railway_utils'),
    fs = require('fs'),
    path = require('path'),
    safeMerge = utils.safe_merge,
    $ = utils.stylize.$,
    log = utils.debug;

function Controller() {}

/**
 * Render response.
 *
 * @param {String} arg1 - view name [optional].
 * @param {Object} arg2 - data passed to view as local variables [optional].
 *
 * When first parameter is omitted action name used as view name:
 * ```
 * action(function index() {
 *     render(); // will render 'index' action of current controller
 * });
 * ```
 *
 * Second argument is optional too, you can set local variables using `this`
 * inside action:
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
Controller.prototype.render = function(arg1, arg2) {
    var railway = this.railway;
    var app = railway.app;
    var views = railway.structure.views;
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
    params.request = this.req;
    params.params = this.params;

    var layout = this.layout(),
        file = this.controllerName + '/' + view;

    var helper = railway.structure.helpers[this.controllerName + '_helper'];
    var appHelper = railway.structure.helpers.application_helper;

    log('Rendering', $(file).grey, 'using layout', $(layout).grey);

    var helpers = railway.helpers.personalize(this);

    var locals = safeMerge(params, this.locals, helpers, helpers.__proto__,
        helper, appHelper);

    ensureFlash(this.req);

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
        var fn = views[file] || views[view];
        if (!fn) {
            self.next(new Error('View "' + file + '" not found'));
            return false;
        }
        params = declarePartial(file, params);
        try {
            var html = fn(params);
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

    function declarePartial(parentFile, p) {
        p = p || {};
        var parentDir = path.dirname(parentFile);
        p.partial = function(file, params) {
            if (file.indexOf('.ejs')) file = file.replace('.ejs', '');
            var dir = path.dirname(file);
            var base = path.basename(file);
            var found;
            var fn = views[found = file] ||
                views[found = parentDir + '/' + file] ||
                views[found = parentDir + '/_' + file] ||
                views[found = dir + '/_' + base];

            if (!fn) {
                throw new Error([
                    'Partial lookup failed. Tried:',
                    ' - ' + file,
                    ' - ' + parentDir + '/' + file,
                    ' - ' + parentDir + '/_' + file,
                    ' - ' + dir + '/_' + base
                ].join('\n'));
            }

            var context = declarePartial(found, params);

            return fn(safeMerge(context, context.locals, p));
        };
        return p;

    }

};

function ensureFlash(req) {
    if (req.flash) {
        return;
    }
    req.flash = function _flash(type, msg) {
        if (this.session === undefined) {
            throw Error('req.flash() requires sessions');
        }
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
 * @param {String} l - [optional] layout name.
 * @return {String} layout name.
 */
Controller.prototype.layout = function layout(l) {
    var railway = this.railway;
    if (typeof l !== 'undefined') {
        this.constructor.layout = l;
    }
    if (typeof this.constructor.layout === 'undefined') {
        var layout = 'layouts/' + this.controllerName + '_layout';
        this.constructor.layout = layout in railway.structure.views ?
            this.controllerName : 'application';
    }
    return this.constructor.layout ? this.constructor.layout + '_layout' : null;
};

/**
 * Load controller
 *
 * @param {String} controllerName - name of controller.
 */
Controller.prototype.load = function(controllerName) {
    var fullName = controllerName + '_controller';
    var source = this.railway.structure.controllers[fullName];
    this.build(source);
};

/**
 * Translation helper
 *
 * @return {String} translated version of arguments.
 */
Controller.prototype.t = function() {
    if (!this._t) {
        this._t = this.railway.T();
        this._t.locale = this.app.settings.defaultLocale || 'en';
        this._T = this.railway.T;
    }
    return this._t.apply(this, [].slice.call(arguments));

};

/**
 * Module exports set of methods listed in Controller.prototype
 */
module.exports = Controller.prototype;

