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

function Controller(name, file, basePath) {

    var actions = {}, beforeFilters = [], afterFilters = [], self = this;

    if (!layoutsCache[file]) {
        // TODO: what if view engine name differs from extension?
        layoutsCache[file] = path.existsSync(app.root + '/app/views/layouts/' + file + '_layout.' + app.settings['view engine']) ? file : 'application';
    }
    var baseLayout = layout = layoutsCache[file];

    this.controllerName = name;
    this.controllerClassName = camelize(file.replace(/\//g, '_') + '_controller', true);
    this.controllerFullName = file;
    this.controllerFile = Controller.index[file];

    if (!this.controllerFile) {
        // throw new Error('Controller ' + file + ' is not defined');
    }

    if (Controller.context[file]) {
        Object.keys(Controller.context[file]).forEach(function (key) {
            this[key] = Controller.context[file][key];
        }.bind(this));
    }

    this.basePath = basePath;
    this.__dirname = app.root;

    this.action = function (name, action) {
        actions[name] = action;
    };

    this.respondTo = function (name) {
        return typeof actions[name] == 'function';
    };

    this.before = this.beforeFilter = function (f, params) {
        beforeFilters.push(filter(arguments));
    };

    this.prependBefore = this.prependBeforeFilter = function (f, params) {
        beforeFilters.unshift(filter(arguments));
    };

    this.after = this.afterFilter = function (f, params) {
        afterFilters.push(filter(arguments));
    };

    this.prependAfter = this.prependAfter = function (f, params) {
        afterFilters.unshift(filter(arguments));
    };

    /*
     * Need to store name of filter to be able to skip it
     */
    function filter(args) {
        if (typeof args[0] === 'string' && typeof args[1] === 'function') {
            // change order
            return [args[1], args[2], args[0]];
        } else {
            // normal order
            return Array.prototype.slice.call(args);
        }
    }

    this.skipBeforeFilter = function (name, only) {
        beforeFilters.forEach(function (filter, i) {
            if (filter && filter[2] && name === filter[2]) {
                skipFilter(beforeFilters, i, only ? only.only : null);
            }
        });
    };

    this.skipAfterFilter = function (name, only) {
        afterFilters.forEach(function (filter, i) {
            if (filter && filter[2] && name === filter[2]) {
                skipFilter(afterFilters, i, only ? only.only : null);
            }
        });
    };

    function skipFilter(filters, index, only) {
        if (!only) {
            delete filters[x];
        } else if (filters[index][1]) {
            if (!filters[index][1].except) {
                filters[index][1].except = [];
            } else if (typeof filters[index][1].except === 'string') {
                filters[index][1].except = [filters[index][1].except];
            }
            if (typeof only === 'string') {
                filters[index][1].except.push(only);
            } else if (only && only.forEach) {
                only.forEach(function (name) {
                    filters[index][1].except.push(name);
                });
            }
        }
    }

    this.layout = function (l) {
        if (typeof l !== 'undefined') {
            layout = l;
        }
        return layout ? layout + '_layout' : null;
    };

    var filterParams = ['password'];
    Controller.prototype.filterParameterLogging = function (args) {
        filterParams = filterParams.concat(Array.prototype.slice.call(arguments));
    };

    this.response = null;
    this.request = null;
    this.session = null;
    this.params = null;
    this.body = null;
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
        this.request.sandbox = {};
        this.response = this.res = res;
        this.params = req.params;
        this.session = res.session;
        this.body = req.body;
        this.next = next;
        this.path_to = Controller.getPathTo(actionName, req, res);
        this.init();

        if (app.disabled('model cache')) {
            app.reloadModels();
        }

        log('');
        log($((new Date).toString()).yellow);
        log($(req.method).bold, $(req.url).grey, 'controller:', $(this.controllerFullName).green, 'action:', $(this.actionName).blue);

        if (Object.keys(req.query).length) {
            log($('Query: ').bold + JSON.stringify(req.query));
        }
        if (req.body) {
            var filteredBody = {};
            Object.keys(req.body).forEach(function (param) {
                if (!filterParams.some(function (filter) {return param.search(filter) !== -1;})) {
                    filteredBody[param] = req.body[param];
                } else {
                    filteredBody[param] = '[FILTERED]';
                }
            });
            log($('Body:  ').bold + JSON.stringify(filteredBody));
        }

        var queue = [];
        enqueue(beforeFilters, queue);
        queue.push(actions[actionName]);
        enqueue(afterFilters, queue);

        next();

        function next() {
            var method = queue.shift();
            if (typeof method == 'function') {
                process.nextTick(function () {
                    method.call(ctl.request.sandbox, next);
                });
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
                function enqueue() { queue.push(f[0]); }
            });
        }
    };

    this.setLocale = function (locale) {
        this.t.locale = T.localeSupported(locale) ? locale : app.settings.defaultLocale;
    };

    this.getLocale = function () {
        return this.t.locale;
    };

    this.load = function (controller) {
        runCode(Controller.index[controller], this);
    }.bind(this);

    var buffer = {};
    this.publish = this.export = function (name, obj) {
        buffer[name] = obj;
    };

    this.use = this.import = function (name) {
        return buffer[name];
    };

    this.init = function () {
        // reset scope variables
        actions = {};
        beforeFilters = [];
        afterFilters = [];
        buffer = {};
        layout = baseLayout;

        // publish models
        if (global.models) {
            Object.keys(global.models).forEach(function (className) {
                this[className] = global.models[className];
            }.bind(this));
        }

        runCode(this.controllerFile, this);
    };

    this.init();

}

Controller.prototype.send = function (x) {
    log('Send to client: ' + x);
    this.response.send.apply(this.response, Array.prototype.slice.call(arguments));
};

Controller.prototype.redirect = function (path) {
    log('Redirected to', $(path).grey);
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
    params.path_to = this.path_to;
    params.request = this.request;
    params.t = this.t;
    var layout = this.layout(),
        file = this.controllerFullName + '/' + view;

    if (this.response.renderCalled) {
        log('Rendering', $(file).grey, 'using layout', $(layout).grey, 'called twice.', $('render() can be called only once!').red);
        return;
    }

    try {
        var helper = require(app.root + '/app/helpers/' + this.controllerFullName + '_helper');
    } catch (e) {
        helper = {};
    }

    log('Rendering', $(file).grey, 'using layout', $(layout).grey);

    var helpers = railway.helpers.personalize(this);

    this.response.renderCalled = true;
    this.response.render(file, {
        locals: safe_merge(params, this.request.sandbox, path_to, helpers, helpers.__proto__, helper),
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

Controller.getPathTo = function (actionName, req, res) {
    return path_to;
};

exports.addBasePath = function (basePath, prefix, context) {
    prefix = prefix || '';
    if (path.existsSync(basePath)) {
        fs.readdirSync(basePath).forEach(function (file) {
            var stat = fs.statSync(path.join(basePath, file));
            if (stat.isFile()) {
                var m = file.match(/(.*?)_controller\.(js|coffee)$/);
                if (m) {
                    var ctl = prefix + m[1];
                    Controller.index[ctl] = Controller.index[ctl] || path.join(basePath, file);
                    Controller.context[ctl] = Controller.context[ctl] || context;
                }
            } else if (stat.isDirectory()) {
                exports.addBasePath(path.join(basePath, file), file + '/');
            }
        });
    }
};

exports.Controller = Controller;

exports.init = function () {
    cache = {};
    Controller.index = {};
    Controller.context = {};
    exports.addBasePath(app.root + '/app/controllers');
};

/**
 * CSRF Protection Section
 */
Controller.prototype.protectFromForgery = function (secret, paramName) {
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
