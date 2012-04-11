var fs = require('fs');
var path = require('path');

exports.stream = null;

exports.init = function () {
    exports.stream = app.settings.quiet ?
        fs.createWriteStream(path.join(app.root, 'log', app.settings.env + '.log')) :
        process.stdout;
};

exports.write = function (str) {
    (exports.stream || process.stdout).write(str + '\n');
};
