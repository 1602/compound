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
Controller.prototype.render = function render(view, params, callback) {
    var start = Date.now();
    var self = this;
    var compound = self.compound;
    var app = compound.app;
    var structure = compound.structure;
    var views = structure.views;
    var inAction = this.context.inAction;

    Array.prototype.forEach.call(arguments, function (arg) {
        switch (typeof arg) {
            case 'object':   return params = arg;
            case 'function': return callback = arg;
            case 'string':   return view = arg;
        }
    });

    if (typeof view !== 'string') view = self.actionName;
    if (typeof params !== 'object') params = {};

    params = safeMerge({}, params);

    params.request = self.context.req;
    params.params = self.params;

    var vc = self.prepareViewContext(params);

    ensureFlash(this.req);

    var layout = getLayoutName();
    var file = getViewFilename();

    layout = layout ? 'layouts/' + layout : false;

    compound.emit('render', vc, self, layout, file);

    layout = calcView(compound, layout, params);
    file = calcView(compound, file, params);

    if (!layout) {
        return self.renderView(file, function(err, html) {
            if(err) {
                return self.next(err);
            }

            if (self.logger) {
                self.logger.emit('render', file, "NONE", Date.now() - start);
            }

            self.res.send(html);
            if (self.context.inAction) {
                return self.next();
            }
        });
    }

    self.renderView(file, function(err, html) {
        if (err) {
            return self.next(err);
        }
        self.viewContext.body = html;
        self.renderView(layout, function(err, html) {
            if(err) {
                return self.next(err);
            }

            if (self.logger) {
                self.logger.emit('render', file, layout, Date.now() - start);
            }

            self.res.send(html);
            if (self.context.inAction) {
                return self.next();
            }
        });
    });

    function getLayoutName() {
        if ('layout' in vc) {
            return vc.layout ? vc.layout + '_layout' : false;
        }
        return self.layout();
    }

    function getViewFilename() {
        return path.join(self.controllerName, view).replace(/\\/g, "/");
    }

    /**
     * Run the calcview hook and change the result if a new view is returned.
     */
    function calcView(compound, view, params) {
        var calcParams = {
            view: view,
            params: params
        };

        compound.emit('calcview', calcParams);

        return calcParams.result || view;
    }

};

Controller.prototype.prepareViewContext = function prepareViewContext(params) {
    // if (this.viewContext) return this.viewContext;
    var self = this;
    var helpers = this.compound.structure.helpers;
    this.viewContext = safeMerge(
        params || {}, this.locals,
        new Pers(helpers[this.controllerName + '_helper']),
        new Pers(helpers.application_helper),
        this.helpers()
    );

    return this.viewContext;

    function Pers(helper) {
        if (!helper) return;

        for (var method in helper) {
            if ('function' === typeof helper[method]) {
                this[method] = Function.prototype.bind.call(helper[method], self);
            }
        }
    }

};

Controller.prototype.renderView = function renderView(view, callback) {
    var filename = this.compound.structure.views[view];
    if (!filename) {
        var err = new Error('Template ' + view + ' not found');
        if (callback) {
            return callback(err);
        } else {
            throw err;
        }
    }
    this.res.render(filename, this.viewContext, callback);
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

Controller.prototype.sendError = function (err) {
    this.res.send({
        code: 500,
        error: err
    });
};

/**
 * Handle specific format. When 'format' present in req.param(), desired handler
 * called, otherwise default handler called. Default handler name can be specified
 * by setting `app.set('default format', 'xml')`. If not specified - default is html
 *
 * Example of usage:
 *
 *     BlogController.prototype.index = function(c) {
 *         Post.all(c.safe(function(post) {
 *             c.format({
 *                 json: function() {c.send(posts);},
 *                 html: function() {c.render({posts: posts});}
 *             });
 *         }));
 *     };
 *
 * @param {Object} handlers - hash of functions to handle each specific format
 */
Controller.prototype.format = function format(handlers) {
    var requestedFormat = this.req.param('format');
    if (requestedFormat in handlers) {
        return handlers[requestedFormat].call(this.locals);
    }
    var defaultFormat = this.req.app.get('default format') || 'html';
    if (defaultFormat in handlers) {
        return handlers[defaultFormat].call(this.locals);
    }
};

/**
 * Return safe callback. This is utility function which allows to reduce nesting
 * level and less code to track errors.
 *
 * Example of usage:
 *
 *     CheckoutController.prototype.orderProducts = function(c) {
 *         c.basket.createOrder(c.safe(function(order) {
 *             this.order = order; // pass order to view
 *             c.render('success');
 *         }));
 *     };
 *
 *     // same as
 *
 *     CheckoutController.prototype.orderProducts = function(c) {
 *         c.basket.createOrder(function(err, order) {
 *             if (err) {
 *                 c.next(err);
 *             } else {
 *                 c.locals.order = order; // pass order to view
 *                 c.render('success');
 *             }
 *         });
 *     };
 *
 */
Controller.prototype.safe = function safe(callback) {
    var c = this;
    return function safeCallback(err) {
        if (err) {
            return c.next(err);
        }
        callback.apply(c.locals, Array.prototype.slice.call(arguments, 1));
    };
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
    };
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
        var layoutName = 'layouts/' + this.controllerName + '_layout';
        this.constructor.layout = layoutName in compound.structure.views ?
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
        if (i === 0) {
            return;
        }
        for (var key in mergeWith) {
            if (key in mergeWhat) continue;
            mergeWhat[key] = mergeWith[key];
        }
    });
    return mergeWhat;
}
