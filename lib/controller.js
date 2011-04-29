var cache = {}, fs = require('fs'),
    // import railway utils
    utils       = require('./railway_utils'),
    safe_merge  = utils.safe_merge,
    camelize    = utils.camelize,
    classify    = utils.classify,
    underscore  = utils.underscore,
    singularize = utils.singularize,
    pluralize   = utils.pluralize,
    $           = utils.stylize.$,
    debug       = utils.debug,
    path        = require('path'),
    runCode     = utils.runCode;

function Controller (name, file, basePath) {

    var actions = {}, beforeFilters = [], afterFilters = [], self = this,
    
    // init layout (sync!)
    layout = path.existsSync(app.root + '/app/views/layouts/' + file + '_layout.ejs') ? file : 'application';

    this.controllerName = name;
    this.controllerClassName = camelize(file.replace(/\//g, '_') + '_controller', true);
    this.controllerFullName = file;
    this.controllerFile = file + '_controller.js';
    this.basePath = basePath;
    this.app = app;
    this.setTimeout = setTimeout;
    this.process = process;
    this.__dirname = app.root;

    this.action = function (name, action) {
        actions[name] = action;
    };

    this.respondTo = function (name) {
        return typeof actions[name] == 'function';
    };

    this.before = this.beforeFilter = function (f, params) {
        beforeFilters.push([f, params]);
    };

    this.prependBefore = this.prependBeforeFilter = function (f, params) {
        beforeFilters.unshift([f, params]);
    };

    this.after = this.afterFilter = function (f, params) {
        afterFilters.push([f, params]);
    };

    this.prependAfter = this.prependAfter = function (f, params) {
        afterFilters.unshift([f, params]);
    };

    this.layout = function (l) {
        if (typeof l !== 'undefined') {
            layout = l;
        }
        return layout ? layout + '_layout' : null;
    };

    this.console = console;
    this.require = require;
    this.response = null;
    this.request = null;
    this.next = null;
    this.t = T();
    this.T = T;

    if (process.cov && !this.__cov) {
        this.__cov = __cov;
    }

    this.perform = function (actionName, req, res) {
        var ctl = this;

        this.actionName = actionName;
        this.request = this.req = req;
        this.response = res;
        this.next = next;
        this.path_to = path_to;
        this.init();

        debug('');
        debug($((new Date).toString()).yellow);
        debug($(req.method).bold, $(req.url).grey, 'controller:', $(this.controllerFullName).green, 'action:', $(this.actionName).blue);

        if (Object.keys(req.query).length) {
            debug($('Query: ').bold + JSON.stringify(req.query));
        }
        if (req.body) {
            debug($('Body:  ').bold + JSON.stringify(req.body));
        }

        var queue = [];
        enqueue(beforeFilters, queue);
        queue.push(actions[actionName]);
        enqueue(afterFilters, queue);

        next();

        function next ()  {
            var method = queue.shift();
            if (typeof method == 'function') {
                process.nextTick(function () {
                    method.call(ctl, next);
                });
            }
        }

        function enqueue (collection, queue) {
            collection.forEach(function (f) {
                var params = f[1];
                if (!params) {
                    enqueue();
                } else if (params.only && params.only.indexOf(actionName) !== -1) {
                    enqueue();
                } else if (params.except && params.except.indexOf(actionName) === -1) {
                    enqueue();
                }
                function enqueue () { queue.push(f[0]); }
            });
        }
    };

    this.setLocale = function (locale) {
        this.t.locale = locale;
    };

    this.getLocale = function () {
        return this.t.locale;
    };

    this.load = function (controller) {
        runCode(app.root + "/app/controllers/" + controller + '_controller.js', this);
    }.bind(this);

    var buffer = {};
    this.export = function (name, obj) {
        buffer[name] = obj;
    };

    this.import = function (name) {
        return buffer[name];
    };

    this.init = function () {
        // reset scope variables
        actions = {};
        beforeFilters = [];
        afterFilters = [];
        buffer = {};

        // publish models
        Object.keys(global.models).forEach(function (className) {
            this[className] = global.models[className];
        }.bind(this));

        runCode(app.root + "/app/controllers/" + this.controllerFile, this);
    };

    this.init();

}

Controller.prototype.send = function (x) {
    debug('Send to client: ' + x);
    this.response.send.apply(this.response, Array.prototype.slice.call(arguments));
};

Controller.prototype.redirect = function (path) {
    debug('Redirected to', $(path).grey);
    this.response.redirect(path.toString());
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
    params.path_to = path_to;
    params.request = this.request;
    params.t = this.t;
    var layout = this.layout(),
        file = this.controllerFullName + '/' + view;

    var helper = require(app.root + '/app/helpers/' + this.controllerFullName + '_helper');

    debug('Rendering', $(file).grey, 'using layout', $(layout).grey);

    this.response.render(file, {
        locals: safe_merge(params, path_to, require('./helpers'), helper),
        layout: layout ? 'layouts/' + layout : false,
        debug:  false
    });
};

Controller.prototype.flash = function () {
    this.request.flash.apply(this.request, Array.prototype.slice.call(arguments));
};

exports.load = function (name, file, base_path) {
    return new Controller(name, file, base_path);
};
