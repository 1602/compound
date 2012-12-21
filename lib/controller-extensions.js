
var utils = require('./utils'),
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
    var compound = this.compound;
    var app = compound.app;
    var views = compound.structure.views;
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
	//console.log("render:this", this);
	var layout = this.layout(params.layout);
    var file = this.controllerName + '/' + view;

    var layout = this.layout(),
        file = this.controllerName + '/' + view;

    var helper = compound.structure.helpers[this.controllerName + '_helper'];
    var appHelper = compound.structure.helpers.application_helper;

    log('Rendering', $(file).grey, 'using layout', $(layout).grey);

    var helpers = compound.helpers.personalize(this);

    var locals = safeMerge(params, this.locals, helpers, helpers.__proto__,
        helper, appHelper);

    ensureFlash(this.req);

    layout = layout ? 'layouts/' + layout : false;

	log("+++");
    if (layout) {
        res.render(file, locals, function (err, html) {
            if (err) {
                self.next(err);
            } else {
                locals.body = html;
                res.render(layout, locals);
            }
        });
    } else {
        res.render(file, locals);
    }

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
    
    if (typeof l !== 'undefined') {
        this.constructor.layout = l;
    }
    
    log(format("controller-extensions::layout called with %s",l));
    
    if (typeof this.constructor.layout === 'undefined') {
        var layout = 'layouts/' + this.controllerName + '_layout';
        this.constructor.layout = layout in compound.structure.views ?
            this.controllerName : 'application';
    }

    log(format("controller-extensions::this.constructor.layout is %s",this.constructor.layout));
    return this.constructor.layout ? this.constructor.layout + '_layout' : null;
    
	function layoutsEnabled() {
		var _ = require("underscore"); //console.log("app",app);
		if (_.isObject(app.get('view options')) && _.has(app.get('view options'), "layout")) {
			return app.get('view options').layout;
		} else {
			return true;
		}
	};    
    
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
 * Module exports set of methods listed in Controller.prototype
 */
module.exports = Controller.prototype;

