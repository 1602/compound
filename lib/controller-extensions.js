var fs = require('fs'),
    path = require('path');

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
Controller.prototype.render = function render(arg1, arg2) {
    var self = this;
    var compound = self.compound;
    var app = compound.app;
    var structure = compound.structure;
    var views = structure.views;
    var helpers = structure.helpers;
    var inAction = this.context.inAction;

    var view, params;

    if (typeof arg1 == 'string') {
        view = arg1;
        params = arg2;
    } else {
        view = self.actionName;
        params = arg1;
    }
    params = params || {};
    params.request = self.req;
    params.params = self.params;

    self.locals = safeMerge(
        params, self.locals,
        new Pers(helpers[self.controllerName + '_helper']),
        new Pers(helpers.application_helper),
        self.helpers()
    );

    ensureFlash(this.req);

    var layout = getLayoutName();
    var file = getViewFilename();

    if (this.logger) {
        this.logger.emit('render', file, layout);
    }

    layout = layout ? 'layouts/' + layout : false;

    if (!views.hasOwnProperty(file)) {
        throw new Error('View ' + file + ' not found');
    }

    if (layout && !views.hasOwnProperty(layout)) {
        throw new Error('Layout ' + layout + ' not found');
    }

    if (!layout) {
        return renderAndFinish(views[file]);
    }

    self.res.render(views[file], self.locals, function (err, html) {
        if (err) {
            self.next(err);
        } else {
            self.locals.body = html;
            renderAndFinish(views[layout]);
        }
    });

    function renderAndFinish(filename) {
        self.res.render(filename, self.locals);
        if (inAction) {
            self.next();
        }
    }

    function getLayoutName() {
        if ('layout' in self.locals) {
            return self.locals.layout ? self.locals.layout + '_layout' : false;
        }
        return self.layout();
    }

    function getViewFilename() {
        return path.join(self.controllerName, view).replace(/\\/g, "/");
    }

    function bundleLocals() {
    }

    function Pers(helper) {
        if (!helper) return;

        for (var method in helper) {
            this[method] = helper[method].bind(self);
        }
    }

};

Controller.prototype.helpers = function () {
    if (!this._helpers) {
        this._helpers = this.compound.helpers.personalize(this);
    }
    return this._helpers;
};

Controller.prototype.contentFor = function (name, content) {
    return this.helpers().contentFor(name, content);
};

function ensureFlash(req) {
    if (req.flash) {
        return;
    }
    req.flash = function _flash(type, msg) {
        if (this.session === undefined) {
            return [];//throw Error('req.flash() requires sessions');
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
    var compound = this.compound;
    var viewOpts = compound.app.set('view options') || {};
    if (viewOpts.layout === false) return false;
    
    if (typeof l !== 'undefined') {
        this.constructor.layout = l;
    }
    if (typeof this.constructor.layout === 'undefined') {
        var layout = 'layouts/' + this.controllerName + '_layout';
        this.constructor.layout = layout in compound.structure.views ?
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
    var source = this.compound.structure.controllers[fullName];
    this.build(source);
};

/**
 * Translation helper
 *
 * @return {String} translated version of arguments.
 */
Controller.prototype.t = function() {
    if (!this._t) {
        this._t = this.compound.T();
        this._t.locale = this.app.settings.defaultLocale || 'en';
        this._T = this.compound.T;
    }
    return this._t.apply(this, [].slice.call(arguments));

};

/**
 * Setup locale for current request
 *
 * @param {String} locale - name of locale, for example 'jp' if you have
 * `config/locales/jp.yml` with translations.
 *
 */
Controller.prototype.setLocale = function (locale) {
    if (!this._t) {
        this._t = this.compound.T();
        this._t.locale = locale;
        this._T = this.compound.T;
    } else {
        this._t.locale = locale;
    }
};

/**
 * Module exports set of methods listed in Controller.prototype
 */
module.exports = Controller.prototype;

function safeMerge(mergeWhat) {
    mergeWhat = mergeWhat || {};
    Array.prototype.forEach.call(arguments, function(mergeWith, i) {
        if (i == 0) return;
        for (var key in mergeWith) {
            if (key in mergeWhat) continue;
            mergeWhat[key] = mergeWith[key];
        }
    });
    return mergeWhat;
};
