/**
 * lib/generators/app_generator.js
 *
 * @defines {AppGenerator}
 * @since {1.1.4}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Generates an entirely new CompoundJS application
 * }
 */

/**
 * Module dependencies
 */
var util = require('util')
  , BaseGenerator = require('./base_generator');

/**
 * Generates an entirely new CompoundJS application
 * 
 * @constructor
 */
function AppGenerator () {
  AppGenerator.super_.call(this);
};
util.inherits(AppGenerator, BaseGenerator);

/**
 * Command line aliases
 */
AppGenerator.aliases = [ 'app', 'a' ];

/**
 * Default key name (first command line argument is stored in options[defaultKeyName])
 */
AppGenerator.prototype.defaultKeyName = 'appName';

/**
 * Performs the generator action
 *
 * @param {Array} arguments
 */
AppGenerator.prototype.perform = function (args) {
  BaseGenerator.prototype.perform.apply(this, arguments);

  this.createDirectoryStructure();
};

/**
 * Creates the basic directory structure
 */
AppGenerator.prototype.createDirectoryStructure = function () {
  var self = this;
  [ 'app/',
    'app/assets/',
    'app/assets/coffeescripts/',
    'app/assets/stylesheets/',
    'app/models/',
    'app/controllers/',
    'app/observers/',
    'app/helpers/',
    'app/views/',
    'app/views/layouts/',
    'db/',
    'db/seeds/',
    'db/seeds/development/',
    'log/',
    'public/',
    'public/images',
    'public/stylesheets/',
    'public/javascripts/',
    'node_modules/',
    'config/',
    'config/locales/',
    'config/initializers/',
    'config/environments/'
  ].forEach(function (dir) {
    self.createDirectory(dir);
  });
};

module.exports = AppGenerator;