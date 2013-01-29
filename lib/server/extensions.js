var utils = require('./utils'),
    Module = require('module').Module,
    fs = require('fs'),
    cs = require('coffee-script'),
    path = require('path');

/**
 * Initialize extensions (using npmfile)
 */
module.exports = function() {
    var root = this.root;

    var autoload = path.join(root, 'config', 'autoload');
    if (utils.existsSync(autoload + '.js') ||
        utils.existsSync(autoload + '.coffee')
    ) {
        var exts = require(autoload);
        init(exts(this), this);
    }

    legacy.call(this);

    initBundledExtensions(this);

    function init(exts, c) {
        if (exts && exts.forEach) {
            exts.forEach(function (e) {
                if (e.init) {
                    e.init(c);
                }
            });
        }
    }

    function legacy() {

        var ctx = getNPMFileContext(this);
        var js = 'npmfile.js', coffee = 'npmfile.coffee',
            filename;

        if (utils.existsSync(path.join(root, js))) {
            filename = js;
        } else if (utils.existsSync(path.join(root, coffee))) {
            filename = coffee;
        }
        if (filename) {
            var code = fs.readFileSync(filename).toString();
            if (filename.match(/\.coffee/)) {
                code = cs.compile(code);
            }
        }
        var fn = new Function('require', 'group', '__dirname', '__filename', code);
        fn.call(null, ctx.require, ctx.group, path.dirname(filename), filename);
    }

};


/**
 * Prepare context for executing npm file. Context has two additional features:
 * - group
 * - improved require (run init method of module)
 *
 * @param {Railway} rw - railway
 */
function getNPMFileContext(rw) {
    var ctx = {};

    ctx.require = function(package) {
        var ext = rw.extensions[package] = Module._load(package, {
            id: rw.root + '/npmfile.js',
            filename: rw.root + '/npmfile.js',
            paths: [rw.root + '/node_modules', __dirname + '/../node_modules']
        });
        if (ext && ext.init) {
            ext.init(rw);
        }
    };

    ctx.group = function(env, callback) {
        if (env == rw.app.settings.env) {
            callback();
        }
    };

    return ctx;
}

function initBundledExtensions(rw) {
    envInfo(rw);
}

/**
 * Setup route /compound/environment.json to return information about environment
 */
function envInfo(rw) {
    var jugglingdbVersion, npmVersion;

    rw.app.all('/compound/environment.json', function(req, res) {

        try {
            var jugglingdbVersion = require('jugglingdb').version;
        } catch (e) {}

        try {
            var npmVersion = require('npm').version;
        } catch (e) {}

        try {
            var viewEngineVersion = require(rw.app.root + '/node_modules/' + rw.app.set('view engine')).version;
        } catch (e) {
            viewEngineVersion = 'not installed';
        }

        if (rw.app.disabled('env info')) return res.send({forbidden: true});
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
