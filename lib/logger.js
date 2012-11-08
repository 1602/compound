var fs = require('fs');
var path = require('path');

/**
 * Store stream
 *
 * TODO: rewrite to modular style
 */
exports.stream = null;

/**
 * Init logger
 *
 * @param {Railway} rw - railway app.
 */
exports.init = function(rw) {
    var logFile = path.join(rw.app.root, 'log', rw.app.settings.env + '.log');
    exports.stream = rw.app.settings.quiet ?
        fs.createWriteStream(logFile) :
        process.stdout;

    rw.utils.debug = function() {
        rw.logger.write(Array.prototype.join.call(arguments, ' '));
    };

};

/**
 * Write method
 *
 * @param {String} str - string to print.
 */
exports.write = function(str) {
    (exports.stream || process.stdout).write(str + '\n');
};
