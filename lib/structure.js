var fs = require('fs');
var path = require('path');
var Module = require('module').Module;
var cs = require('coffee-script');
var _ = require("underscore");
var format = require("util").format;

module.exports = function(rw) {

    return function() {
        return {
            views: read('app/views', 'view'),
            helpers: read('app/helpers', true),
            controllers: read('app/controllers'),
            models: read('app/models', true)
        };
    };

    function read(dir, doRequire, cts, prefix) {
        var contents = cts || {};
        var abspath = rw.app.root + '/' + dir;
        prefix = prefix || '';

        if (fs.existsSync(abspath)) {
            fs.readdirSync(abspath).forEach(readAndWatch);
        }

        return contents;

        function readAndWatch(filename) {
            if (filename.match(/^\./)) {
                // skip files starting with point
                return;
            }
            var file = abspath + '/' + filename;
            var ext = filename.split('.').pop();
            if (fs.statSync(file).isDirectory()) {
                read(dir + '/' + filename, doRequire, contents, prefix + filename + '/');
            } else {
                var name = prefix + filename.replace('.' + ext, '');
                contents[name] =
                    doRequire ?
                    requireFile(file, doRequire, rw.app) :
                    fs.readFileSync(file).toString();

                if (ext === 'coffee' && !doRequire) {
                    contents[name] = cs.compile(contents[name]);
                }

                if (rw.app.enabled('watch')) {

                    fs.watch(file, function() {
                        if (doRequire) {
                            delete Module._cache[file];
                            contents[name] = requireFile(file, doRequire, rw.app);
                        } else {
                            contents[name] = fs.readFileSync(file).toString();

                            if (ext === 'coffee') {
                                contents[name] = cs.compile(contents[name]);
                            }

                        }
                    });
                }
            }
        }
    }
};

function requireFile(file, how) {
    if (how === true) return require(file);
    if (how === 'view') return file;
}
