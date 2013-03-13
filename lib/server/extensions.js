var utils = require('../utils'),
    Module = require('module').Module,
    fs = require('fs'),
    cs = require('coffee-script'),
    path = require('path');

/**
 * Initialize extensions
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
