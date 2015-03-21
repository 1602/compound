var Compound = require('../compound');
var util = require('util');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');

function CompoundServer(app, root, opts) {

    Compound.call(this, app, root);

    if (app) {
        if (opts && opts.key && opts.cert) {
            this.server = https.createServer(opts, app);
        } else {
            this.server = http.createServer(app);
        }

        app.listen = function() {
            app.emit('before listening', this.server);
            this.server.listen.apply(this.server, arguments);
        }.bind(this);

        this.injectMiddlewareAt(0, function compound(req, res, next) {
            req.locals = req.locals || {};
            app.compound.emit('request', req, res);
            next();
        });
    }

    this.__defineGetter__('rootModule', function() {
        return module.parent;
    });

    this.logger = require('./logger');
    this.generators = require('./generators');
    this.installer = require('./installer');
    this.structure.tools = this.tools = require('./tools');
    this.extensions = require('./extensions');
    this.middleware = require('./middleware');
    this.loadStructure = require('./structure')(this);
    this.__defineGetter__('version', function() {
        return require('../../package').version;
    });
}

util.inherits(CompoundServer, Compound);

CompoundServer.prototype.init = function initCompoundServer(root) {
    var compound = this;

    envInfo(this);
    compound.logger.init(compound);
    Compound.prototype.init.call(compound, root);

    if (compound.app) {
        if (compound.app.enabled('merge javascripts')) {
            var jsDir = compound.app.get('jsDirectory');
            if (jsDir) {
                ensureDirClean(compound.app.root + '/public' +
                jsDir, 'cache');
            }
        }

        if (compound.app.enabled('merge stylesheets')) {
            var cssDir = compound.app.get('cssDirectory');
            if (cssDir) {
                ensureDirClean(compound.app.root + '/public' +
                cssDir, 'cache');
            }
        }
    }

};

/**
 * Put middleware inside stack before anchor.
 *
 * @param {String} anchor - name of anchor middleware.
 * @param {Function} middleware - middleware.
 *
 * @return {Boolean} - is anchor middleware was found.
 */
CompoundServer.prototype.injectMiddlewareBefore = function(anchor, route, middleware) {
    var mod = this.app, anchorPosition;
    if (!mod) {
        return;
    }
    mod.stack.forEach(function (r, i) {
        if (r.handle === anchor || r.handle.name === anchor) {
            anchorPosition = i;
        }
    });
    this.injectMiddlewareAt(anchorPosition, route, middleware);
    return 'undefined' !== typeof anchorPosition;
};

/**
 * Put middleware inside stack after anchor.
 *
 * @param {Function,String} anchor - middleware or name of anchor middleware.
 * @param {Function} middleware - middleware.
 *
 * @return {Boolean} - is anchor middleware was found.
 */
CompoundServer.prototype.injectMiddlewareAfter = function(anchor, route, middleware) {
    var mod = this.app, anchorPosition;
    if (!mod) {
        return;
    }
    mod.stack.forEach(function (r, i) {
        if (r.handle === anchor || r.handle.name === anchor) {
            anchorPosition = i;
        }
    });
    this.injectMiddlewareAt(anchorPosition + 1, route, middleware);
    return 'undefined' !== typeof anchorPosition;
};

CompoundServer.prototype.injectMiddlewareAt = function(position, route, middleware) {
    if (typeof route === 'function') {
        middleware = route;
        route = '';
    }
    var mod = this.app;
    if (!mod) {
        return;
    }
    if (position <= 0) {
        mod.stack.unshift({route: route, handle: middleware});
    } else if (position && position <= mod.stack.length) {
        mod.stack.splice(position, 0, {route: route, handle: middleware});
    } else {
        mod.use(middleware);
    }
};

/**
 * Create http server object. Automatically hook up SSL keys stored in
 * app.root/config/tsl.{cert|key}
 *
 * @param {Object} options - example:
 *   {root: __dirname, any other options for express}.
 * @return {Function} express server.
 */
exports.createServer = function(options) {
    options = options || {};
    if (typeof options === 'string') {
        options = {root: options};
    }
    var root = options.root || process.cwd();
    delete options.root;

    var express = require('express');
    var app = express(options);
    new CompoundServer(app, root, options);

    app.express3 = true;

    return app;
};

exports.controllers = require('./controllers');

exports.Compound = CompoundServer;

/**
 * Setup route /compound/environment.json to return information about environment
 */
function envInfo(rw) {
    rw.on('after configure', defineEnvInfoRoutes.bind(rw));
}

function defineEnvInfoRoutes() {
    var rw = this;
    var jugglingdbVersion, npmVersion, viewEngineVersion;

    if (!rw.app) {
        return;
    }

    rw.app.get('/compound/environment.json', function(req, res) {

        if (rw.app.disabled('env info')) {
            return res.send({forbidden: true});
        }

        try {
            jugglingdbVersion = require('jugglingdb').version;
        } catch (e) {
            jugglingdbVersion = 'not installed';
        }

        try {
            npmVersion = require('npm').version;
        } catch (e) {}

        try {
            viewEngineVersion = require(rw.app.root + '/node_modules/' + rw.app.set('view engine')).version;
        } catch (e) {
            viewEngineVersion = 'not installed';
        }

        res.send({
            settings: rw.app.settings,
            versions: {
                core: process.versions,
                npm: npmVersion,
                compound: rw.version,
                jugglingdb: jugglingdbVersion,
                templating: {
                    name: rw.app.set('view engine'),
                    version: viewEngineVersion
                }
            },
            application: {
                root: rw.app.root,
                database: require(rw.app.root + '/config/database')[rw.app.set('env')].driver,
                middleware: rw.app.stack.map(function(m) {
                    return m.handle.name;
                })
            },
            env: process.env
        });
    });
}

/**
 * Cleanup or create dir
 *
 * @param {String} dir - path to dir to create.
 * @param {String} prefix - only remove files started with that prefix.
 */
function ensureDirClean(dir, prefix) {
    fs.exists(dir, function(exists) {
        if (exists) {
            fs.readdir(dir, function(err, files) {
                files.filter(function(file) {
                    return file.indexOf(prefix + '_') === 0;
                }).map(function(file) {
                    return path.join(dir, file);
                }).forEach(fs.unlink);
            });
        } else {
            fs.mkdir(dir, 0755, function() {
            });
        }
    });
}
