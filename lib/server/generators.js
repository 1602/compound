/**
 * lib/generators.js
 *
 * @defines {Generators}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Manages all generators
 * }
 */

/**
 * Generators class
 * Manages all generators
 *
 * @constructor
 */
function Generators () {
  this.generators = {};
  this.generatorAliases = {};

  this.loadGenerators([
    'app',
    'model',
    'crud',
    'controller',
    'clientside'
  ]);
};

/**
 * Initialization
 *
 * @param {Compound} Compound app
 */
Generators.prototype.init = function (app) {
  this.app = app;
};

/**
 * Performs a generator action
 *
 * @param {String} Generator alias
 * @param {Array}  Arguments (optional)
 */
Generators.prototype.perform = function (alias, args) {
  var generator;
  if (generator = this.generatorForAlias(alias)) {
    generator.init(this.app, args);
    generator.perform(args);
  } else {
    console.log('Generator "' + alias + '" not found');
  }
};

/**
 * Returns a generator matching the given alias
 *
 * @param {String} Generator alias
 */
Generators.prototype.generatorForAlias = function (alias) {
  if (this.generatorAliases.hasOwnProperty(alias)) {
    return new this.generatorAliases[alias];
  } else {
    return false;
  }
};

/**
 * Loads generators
 * 
 * @param {Array} List of generator names
*/
Generators.prototype.loadGenerators = function (generators) {
  var self = this;

  this.generators = {};
  this.generatorAliases = {};
  generators.forEach(function (generator) {
    self.generators[generator] = require('./generators/' + generator + '_generator');
    self.addAliases(generator, self.generators[generator]);
  });
};

/**
 * Adds command line aliases for a specific generator
 * so that it can be called using `compound generate generatorAlias`
 *
 * @param {String} Generator name
 * @param {Generator} Generator class
 */
Generators.prototype.addAliases = function (generatorName, generator) {
  var self = this;

  generator.aliases.forEach(function (alias) {
    self.generatorAliases[alias] = generator;
  });
};

Generators.prototype.list = function () {
    return Object.keys(this.generators).join(', ');
};

module.exports = new Generators();
