var fs = require('fs');
var path = require('path');

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
                contents[prefix + filename.replace('.' + ext, '')] =
                    doRequire ?
                    require(file) :
                    fs.readFileSync(file).toString();
            }
        });
    }
    return contents;
}

