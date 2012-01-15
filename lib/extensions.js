var utils = require('./railway_utils'),
    path = require('path');

app.extensions = {};

exports.init = function () {
    app.extensions = {};
    var ctx = getNPMFileContext();
    var root = app.root + '/',
        js = 'npmfile.js', coffee = 'npmfile.coffee',
        filename;
    if (path.existsSync(root + js)) {
        filename = js;
    } else if (path.existsSync(root + coffee)) {
        filename = coffee;
    }
    if (filename) {
        utils.runCode(filename, ctx);
    }

    initBundledExtensions();
};

function getNPMFileContext() {
    var ctx = {};

    ctx.require = function (package) {
        var ext = app.extensions[package] = require(package);
        if (ext && ext.init) {
            ext.init();
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

function envInfo() {
    var jugglingdbVersion, npmVersion;

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

    app.all('/railway/environment.json', function (req, res) {
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
