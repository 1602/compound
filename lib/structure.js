var fs = require('fs');
var path = require('path');

module.exports = function (rw) {
    return {
        views: read('app/views'),
        helpers: read('app/helpers', true),
        controllers: read('app/controllers'),
        models: read('app/models', true)
    };

    function read(dir, doRequire, cts, prefix) {
        var contents = cts || {};
        prefix = prefix || '';
        var abspath = rw.app.root + '/' + dir;
        if (fs.existsSync(abspath)) {
            fs.readdirSync(abspath).forEach(function (filename) {
                if (filename.match(/^\./)) {
                    // skip files starting with point
                    return;
                }
                var file = abspath + '/' + filename;
                var ext = filename.split('.').pop();
                if (fs.statSync(file).isDirectory()) {
                    read(dir + '/' + filename, doRequire, contents, prefix + filename + '/');
                } else {
                    contents[prefix + filename.replace('.' + ext, '')] =
                        doRequire ?
                        require(file) :
                        fs.readFileSync(file).toString();
                }
            });
        }
        return contents;
    }

    if (rw.app.enabled('watch')) {
        // watch for changes in controllers

        var ctls = rw.app.root + '/app/controllers';
        // forEach(module.exports.controllers, function (file) {
        // delete Module._cache[filename];
        // var m = require(filename);
        // });

    }

};

