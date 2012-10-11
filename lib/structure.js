var fs = require('fs');
var path = require('path');

module.exports = {
    // views: read('app/views'),
    helpers: read('app/helpers', true),
    controllers: read('app/controllers')
};

function read(dir, doRequire, cts, prefix) {
    var contents = cts || {};
    prefix = prefix || '';
    var abspath = app.root + '/' + dir;
    if (fs.existsSync(abspath)) {
        fs.readdirSync(abspath).forEach(function (filename) {
            var file = abspath + '/' + filename;
            var ext = filename.split('.').pop();
            if (ext === 'js' || ext === 'coffee') {
                contents[prefix + filename.replace('.' + ext, '')] =
                    doRequire ?
                    require(file) :
                    fs.readFileSync(file).toString();
            } else if (fs.statSync(file).isDirectory()) {
                read(dir + '/' + filename, doRequire, contents, prefix + filename + '/');
            }
        });
    }
    return contents;
}

