var fs = require('fs');
var path = require('path');

exports.stream = null;

exports.init = function (rw) {
    exports.stream = rw.app.settings.quiet ?
        fs.createWriteStream(path.join(app.root, 'log', app.settings.env + '.log')) :
        process.stdout;

    rw.utils.debug = function () {
        rw.logger.write(Array.prototype.join.call(arguments, ' '));
    };

};

exports.write = function (str) {
    (exports.stream || process.stdout).write(str + '\n');
};
