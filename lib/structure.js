var fs = require('fs');
var path = require('path');
var Module = require('module').Module;

module.exports = {
    views: read('app/views'),
    helpers: read('app/helpers', true),
    controllers: read('app/controllers')
};

function read(dir, doRequire, cts, prefix) {
    var contents = cts || {};
    prefix = prefix || '';
    var abspath = app.root + '/' + dir;
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
                var name = prefix + filename.replace('.' + ext, '');
                contents[name] =
                    doRequire ?
                    require(file) :
                    fs.readFileSync(file).toString();

                if (app.enabled('watch')) {
                    fs.watch(file, function () {
                        if (doRequire) {
                            delete Module._cache[file];
                            contents[name] = require(file);
                        } else {
                            contents[name] = fs.readFileSync(file).toString();
                        }
                    });
                }
            }
        });
    }
    return contents;
}

