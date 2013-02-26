var Compound = require('../compound');
var util = require('util');
var express = require('express');
var http = require('http');
var fs = require('fs');
var path = require('path')

function CompoundServer(app, root) {

    Compound.call(this, app, root);

    this.server = http.createServer(app);

    app.listen = function(port, host, cb) {
        app.emit('before listening', this.server);
        this.server.listen(port, host, cb);
    }.bind(this);

    this.__defineGetter__('rootModule', function() {
        return module.parent;
    });

    this.logger = require('./logger');

    var AssetsCompiler = require('./assets-compiler');
    this.assetsCompiler = new AssetsCompiler(this);

    this.generators = require('./generators');

    this.tools = require('./tools');

    this.extensions = require('./extensions');

    this.middleware = require('./middleware');

    this.structure = require('./structure')(this);
}

util.inherits(CompoundServer, Compound);

/**
 * Grab compound version from package.json
 */
CompoundServer.prototype.version = require('../../package').version;

CompoundServer.prototype.init = function () {
    var compound = this, time;

    compound.logger.init(compound);
    Compound.prototype.init.call(compound);

    if (compound.app.enabled('clientside')) {
        if (fs.existsSync(compound.app.root + '/client-side.js')) {
            fs.unlinkSync(compound.app.root + '/client-side.js');
        }
        compound.generators.init(compound);
        var result = [];
        compound.generators.perform('cs', result);
        var browserify = require('browserify');
        var b = browserify();
        // b.fake('util', path.resolve(__dirname + '/../client/util.js'));
        var shims = {
            'express': '../client/application.js',
            'fs': '../client/fs.js',
            'module': '../../templates/blank.js',
            'compound': '../client/fake-compound.js'
        };
        Object.keys(shims).forEach(function (name) {
            var file = path.resolve(__dirname + '/' + shims[name]);
            var opts = getOpts();
            opts.expose = name;
            b.require(file, opts);
        });

        b.add(compound.app.root + '/client-side.js');
        // result.forEach(function (f) {
            // b.add(f);
            // b.expose(f, f);
        // });
        time = Date.now();
        b.bundle(getOpts(), tryMinify);
    }

    function getOpts() {
        return {
            insertGlobals: true,
            detectGlobals: false,
            ignoreMissing: true
        };
    }

    function tryMinify(err, data) {
        fs.writeFileSync(source + '.js', data);
        console.log('browserify finished in ' + (Date.now() - time) + 'ms');
        try {
            var uglify = require('uglify-js');
        } catch (e) {
            console.log('Run "npm install uglify-js" command if you want to minify resulting bundle');
        }
        if (!uglify) return;

        var source = compound.app.root + '/public/javascripts/compound';
        fs.writeFileSync(source + '.min.js', uglify.minify(source + '.js').code);
        console.log('minified',
        (fs.statSync(source + '.js').size >> 10) + 'K',
        '->',
        (fs.statSync(source + '.min.js').size >> 10) + 'K');
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

    var app = express(options);
    var compound = new CompoundServer(app, root);

    app.express2 = !!express.version.match(/^2/);
    app.express3 = !!express.version.match(/^3/);

    return app;
};

exports.controllers = require('./controllers');

exports.Compound = CompoundServer;
