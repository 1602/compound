/**
 * lib/generators/generator_utils.js
 *
 * @defines {GeneratorUtilities}
 * @since {1.1.4}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Provides several utilities for file generation used
 *   in the generators
 * }
 */

/**
 * Module dependencies
 */
var fs = require('fs')
  , path = require('path')
  , sys = require('sys')
  , utils = require('../utils');

/**
 * Shortcut required railway utils
 */
var pluralize = utils.pluralize
  , camelize = utils.camelize
  , $ = utils.stylize.$
  , exec = require('child_process').exec;

/**
 * Provides several utilities for file generation used
 * in the generators
 */

function GeneratorUtilities () {};

/**
 * Create directory
 * @param {String} dir - dirname.
 * @private
 */
GeneratorUtilities.prototype.createDirectory = function (dir) {
    var root = process.cwd();
    if (this.options.appName && !this.createDirectory.rootCreated) {
        this.createDirectory.rootCreated = true;
        this.createDirectory('');
    }
    if (this.options.appName) {
        dir = path.join(this.options.appName, dir);
    }
    if (utils.existsSync(path.join(root, dir))) {
        sys.puts($('exists').bold.grey + '  ' + dir);
    } else {
        fs.mkdirSync(path.join(root, dir), 0755);
        sys.puts($('create').bold.green + '  ' + dir);
    }
};

module.exports = GeneratorUtilities;