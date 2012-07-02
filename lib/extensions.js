var utils = require('./railway_utils'),
    path = require('path');

app.extensions = {};

/**
 * Initialize extensions (using npmfile)
 */
exports.init = function (root) {
    app.extensions = {};
    var ctx = getNPMFileContext(root);
    var js = 'npmfile.js', coffee = 'npmfile.coffee',
        filename;

    if (railway.utils.existsSync(path.join(root, js))) {
        filename = js;
    } else if (railway.utils.existsSync(path.join(root, coffee))) {
        filename = coffee;
    }
    if (filename) {
        utils.runCode(path.join(root, filename), ctx);
    }

    initBundledExtensions();
};

/**
 * Prepare context for executing npm file. Context has two additional features:
 * - group
 * - improved require (run init method of module)
 */
function getNPMFileContext(root) {
    var ctx = {};

    ctx.require = function (package) {
        var ext = app.extensions[package] = require(package);
        if (ext && ext.init) {
            ext.init(root);
        }
    };

    ctx.group = function (env, callback) {
        if (env == app.settings.env) {
            callback();
        }
    };

    return ctx;
};

function initBundledExtensions() {
    envInfo();
}

/**
 * Setup route /railway/environment.json to return information about environment
 */
function envInfo() {
    var jugglingdbVersion, npmVersion;

    app.all('/railway/environment.json', function (req, res) {

        try {
            var jugglingdbVersion = require('jugglingdb').version;
        } catch(e) {}

        try {
            var npmVersion = require('npm').version;
        } catch(e) {}

        try {
            var viewEngineVersion = require(app.root + '/node_modules/' +  app.set('view engine')).version;
        } catch(e) {
            viewEngineVersion = 'not installed';
        }

        if (app.disabled('env info')) return res.send({forbidden: true});
        res.send({
            settings: app.settings,
            versions: {
                core: process.versions,
                npm: npmVersion,
                railway: railway.version,
                jugglingdb: jugglingdbVersion,
                templating: {
                    name: app.set('view engine'),
                    version: viewEngineVersion
                }
            },
            application: {
                root: app.root,
                database: require(app.root + '/config/database')[app.set('env')].driver,
                middleware: app.stack.map(function (m) {
                    return m.handle.name;
                })
            },
            env: process.env,
        });
    });
}
