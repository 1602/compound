var fs = require('fs');
var path = require('path');
var coloring = /\u001b\[\d+m/g;

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
    if (!compound.app) return;
    var logFile = path.join(compound.root,
        'log', compound.app.get('env') + '.log');

    compound.on('after configure', function() {

        var quiet = compound.app.enabled('quiet');

        exports.stream = exports.stream || quiet ?
            fs.createWriteStream(logFile, {flags: 'a', mode: 0666, encoding: 'utf8'}) :
            process.stdout;

        compound.utils.debug = quiet ?
        function () {
            compound.logger.write(Array.prototype.join.call(arguments, ' ')
            .replace(coloring, ''));
        } : function() {
            compound.logger.write(Array.prototype.join.call(arguments, ' '));
        };

    });

};

/**
 * Write method
 *
 * @param {String} str - string to print.
 */
exports.write = function(str) {
    (exports.stream || process.stdout).write(str + '\n');
};
