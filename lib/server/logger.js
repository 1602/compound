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
    var app = compound.app;
    if (!app) return;

    compound.constructor.prototype.log = function(s) {
        compound.logger.write(s);
    };

    compound.on('after configure', function() {

        var quiet = app.enabled('quiet');

        if (quiet) {
            var logDir = app.get('log dir') || path.join(compound.root, 'log'),
                logFile = path.join(logDir, app.get('env') + '.log');

            fs.exists(logDir, function(exists) {
                if (!exists) return;
                exports.stream = fs.createWriteStream(logFile, {
                    flags: 'a',
                    mode: 0666,
                    encoding: 'utf8'
                });
            });
        } else {
            exports.stream = process.stdout;
        }

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
    var stream = exports.stream || process.stdout;
    stream && stream.write(str + '\n');
};
