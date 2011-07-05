var utils = require('./railway_utils'),
    path = require('path');

require.paths.unshift(app.root + '/node_modules');

app.extensions = {};

exports.init = function () {
    app.extensions = {};
    ctx = getNPMFileContext();
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
