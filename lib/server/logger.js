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
 * @param {CompoundServer} compound - compound app.
 */
exports.init = function(compound) {
    var logFile = path.join(compound.app.root,
        'log', compound.app.settings.env + '.log');

    exports.stream = compound.app.settings.quiet ?
        fs.createWriteStream(logFile) :
        process.stdout;

    compound.utils.debug = function() {
        compound.logger.write(Array.prototype.join.call(arguments, ' '));
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
