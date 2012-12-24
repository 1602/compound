/**
 * lib/generators/model_generator.js
 *
 * @defines {ModelGenerator}
 * @since {1.1.4}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Generates a model from the given fields using the format
 *   fieldName:Type - per default `Type` is a String
 * }
 */

/**
 * Module dependencies
 */
var util = require('util')
  , BaseGenerator = require('./base_generator');

/**
 * Generates a model
 * 
 * @constructor
 */
function ModelGenerator () {
  AppGenerator.super_.call(this);
};
util.inherits(AppGenerator, BaseGenerator);

/**
 * Command line aliases
 */
ModelGenerator.aliases = [ 'app', 'a' ];

/**
 * Default key name (first command line argument is stored in options[defaultKeyName])
 */
AppGenerator.prototype.defaultKeyName = 'appName';

/**
 * Performs the generator action
 *
 * @param {Array} arguments
 */
ModelGenerator.prototype.perform = function (args) {
  BaseGenerator.prototype.perform.apply(this, arguments);

  this.validateModelName();
};

/**
 * Validates the model name
 */
ModelGenerator.prototype.validateModelName = function() {
  // TODO
};

module.exports = ModelGenerator;