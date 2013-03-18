var Compound = require('../compound');
var util = require('util');
var http = require('http');
var fs = require('fs');
var path = require('path')

function CompoundServer(app, root) {

    Compound.call(this, app, root);

    if (app) {
        this.server = http.createServer(app);

        app.listen = function(port, host, cb) {
            app.emit('before listening', this.server);
            this.server.listen(port, host, cb);
        }.bind(this);
    }

    this.__defineGetter__('rootModule', function() {
        return module.parent;
    });

    this.logger = require('./logger');
    this.generators = require('./generators');
    this.installer = require('./installer');
    this.tools = require('./tools');
    this.extensions = require('./extensions');
    this.middleware = require('./middleware');
    this.structure = require('./structure')(this);
    this.__defineGetter__('version', function() {
        return require('../../package').version;
    });
}

util.inherits(CompoundServer, Compound);

CompoundServer.prototype.init = function initCompoundServer() {
    var compound = this, time;

    envInfo(this);
    compound.logger.init(compound);
    Compound.prototype.init.call(compound);

    if (compound.app) {
        if (compound.app.enabled('merge javascripts')) {
            ensureDirClean(compound.app.root + '/public' +
                compound.app.get('jsDirectory'), 'cache');
        }

        if (compound.app.enabled('merge stylesheets')) {
            ensureDirClean(compound.app.root + '/public' +
                compound.app.get('cssDirectory'), 'cache');
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
    var mod = this.app, i, l = mod.stack.length;
    if (position <= 0) {
        mod.stack.unshift({route: route, handle: middleware});
    } else if (position && position <= l) {
        for (i = l; i > position; i--) {
            mod.stack[i] = mod.stack[i - 1];
        }
        mod.stack[position] = {route: route, handle: middleware};
    } else {
        mod.use(middleware);
    }
}

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
    var compound = new CompoundServer(app, root);

    app.express2 = !!express.version.match(/^2/);
    app.express3 = !!express.version.match(/^3/);

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
    var jugglingdbVersion, npmVersion;

    rw.app && rw.app.get('/compound/environment.json', function(req, res) {

        if (rw.app.disabled('env info')) return res.send({forbidden: true});

        try {
            var jugglingdbVersion = require('jugglingdb').version;
        } catch (e) {
            jugglingdbVersion = 'not installed';
        }

        try {
            var npmVersion = require('npm').version;
        } catch (e) {}

        try {
            var viewEngineVersion = require(rw.app.root + '/node_modules/' + rw.app.set('view engine')).version;
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
            fs.mkdir(dir, 0755);
        }
    });
}
