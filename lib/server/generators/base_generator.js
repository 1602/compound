/**
 * lib/generators/base_generator.js
 *
 * @defines {BaseGenerator}
 * @since {1.1.4}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Provides a base class for all other generators
 * }
 */

/**
 * Module dependencies
 */

var util = require('util')
, GeneratorUtilities = require('./generator_utils');

function BaseGenerator () {
    GeneratorUtilities.call(this);
    this.options = {};
};
util.inherits(BaseGenerator, GeneratorUtilities);

/**
 * Initialization
 *
 * @param {Compound} Compound app
 * @param {Array} args - Command line arguments
 */
BaseGenerator.prototype.init = function (compound) {
    this.app  = compound.app;
    this.baseDir = compound.root;
    this.options = [];
};

/**
 * Parse command line options
 *
 * @param {String} defaultKeyName - key name to interpret first arg.
 * @param {Array} args - Command line arguments 
 * @private
 */
BaseGenerator.prototype.parseOptions = function () {
    var options = this.options;
    while (options.length) {
        options.pop();
    }
    options.tpl = this.app && this.app.settings['view engine'] || 'ejs';
    options.coffee = this.app && this.app.enabled('coffee');
    options.db = 'memory';
    options.stylus = false;

    var defKey = this.defaultKeyName;
    var key = defKey || false;
    this.args.forEach(function(arg) {
        if (arg.slice(0, 2) == '--') {
            key = arg.slice(2);
            options[key] = true;
        } else if (arg[0] == '-') {
            key = arg.slice(1);
            options[key] = true;
        } else if (key) {
            options[key] = arg;
            if (defKey && key !== defKey) {
                key = defKey;
                defKey = false;
            } else {
                key = false;
            }
        } else {
            options.push(arg);
        }
    });
    if (options.nocoffee) {
        options.coffee = false;
    }
};

/**
 * Performs the generator action
 *
 * @param {Array} arguments
 */
BaseGenerator.prototype.perform = function (args) {
    this.args = args;
    this.parseOptions();
}

module.exports = BaseGenerator;
