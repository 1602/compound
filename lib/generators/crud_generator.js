/**
 * lib/generators/crud_generator.js
 *
 * @defines {CrudGenerator}
 * @since {1.1.4}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Generates a scaffold
 * }
 */

/**
 * Module dependencies
 */
var util = require('util')
  , BaseGenerator = require('./base_generator')
  , ModelGenerator = require('./model_generator')
  , path = require('path');

var utils = require('../utils')
  , pluralize = utils.pluralize
  , camelize = utils.camelize;

/**
 * Generates a scaffold
 * 
 * @constructor
 */
function CrudGenerator () {
  CrudGenerator.super_.call(this);
};
util.inherits(CrudGenerator, BaseGenerator);

/**
 * Command line aliases
 */
CrudGenerator.aliases = [ 'crud', 'c', 'scaffold', 's' ];

/**
 * Default key name (first command line argument is stored in options[defaultKeyName])
 */
CrudGenerator.prototype.defaultKeyName = 'controllerName';

/**
 * Performs the generator action
 *
 * @param {Array} arguments
 */
CrudGenerator.prototype.perform = function (args) {
  BaseGenerator.prototype.perform.apply(this, arguments);

  if (this.options.appName) {
    this.baseDir = path.join(this.baseDir, this.options.appName);
  }

  this.createDirectoryStructure();
  this.generateModel();
  this.copyFiles();
  this.patchRoutes();
};

/**
 * Asks the ModelGenerator to generate a model
 */
CrudGenerator.prototype.generateModel = function() {
  var modelGenerator = new ModelGenerator();
  modelGenerator.init({ app: this.app });
  modelGenerator.perform(this.args);

  this.modelProperties = modelGenerator.parseProperties();
};

/**
 * Creates the basic directory structure
 */
CrudGenerator.prototype.createDirectoryStructure = function () {
  var self = this;

  var model = this.args[0].split('.').pop();
  var parents = this.args[0].split('.').slice(0, -1);
  var models = pluralize(model).toLowerCase();

  if (!model) {
      console.log('Usage example: railway g crud post title content' +
          'published:boolean');
      console.log('               railway g crud post title content' +
          'published:boolean --coffee');
      return;
  }
  var ns = models.split('/');
  ns.pop();

  [ 

    'app/',
    'app/controllers/',
    'app/helpers/',
    'app/views/',
    'app/views/' + models + '/',
    'app/views/layouts',
    'test/',
    'test/controllers/',

  ].forEach(function (dir) {
    self.createDirectory(dir);
  });

  // createParents(ns, 'app/controllers/')


};

/**
 * Copy files from templates directory
 */
CrudGenerator.prototype.copyFiles = function () {
  var self = this;

  var model = this.args[0].split('.').pop();
  var parents = this.args[0].split('.').slice(0, -1);
  var models = pluralize(model).toLowerCase();

  var templateVariables = {
    'CODE':   this.getCodeExtension(),
    'TPL':    this.getTemplateEngine(),
    'MODELS': models,
    'VALID_ATTRIBUTES': this.modelProperties.map(function (attr) {
      return attr.property + ": ''";
    }).join(',\n        '),

    'model': model.toLowerCase(),
    'models': models,
    'Model': camelize(model, true)
  };

  [

    [ 'app/helpers/model_helper.{{ CODE }}'
      , 'app/helpers/{{ MODELS }}.{{ CODE }}' ],
    [ 'test/controllers/crud_controller_test.js'
      , 'test/controllers/{{ MODELS }}_controller_test.js'],

    [ 'app/views/layouts/scaffold_layout.{{ TPL }}'
      , 'app/views/layouts/{{ MODELS }}_layout.{{ TPL }}'],
    [ 'app/views/scaffold/_form.{{ TPL }}'
      , 'app/views/{{ MODELS }}/_form.{{ TPL }}'],

    // CRUD
    [ 'app/views/scaffold/show.{{ TPL }}'
      , 'app/views/{{ MODELS }}/show.{{ TPL }}'],
    [ 'app/views/scaffold/new.{{ TPL }}'
      , 'app/views/{{ MODELS }}/new.{{ TPL }}'],
    [ 'app/views/scaffold/edit.{{ TPL }}'
      , 'app/views/{{ MODELS }}/edit.{{ TPL }}'],
    [ 'app/views/scaffold/index.{{ TPL }}'
      , 'app/views/{{ MODELS }}/index.{{ TPL }}']

  ].forEach(function (file) {
    var sourceFileIndex = 0
      , destFileIndex   = 1

    self.copyFile(file[sourceFileIndex], file[destFileIndex], templateVariables);
  });

  [
    'test/test_helper.js'
  ].forEach(function (file) {
    self.copyFile(file, templateVariables);
  });
};

/**
 * Adds resource routes
 */
CrudGenerator.prototype.patchRoutes = function() {
  var model = this.args[0].split('.').pop();
  var parents = this.args[0].split('.').slice(0, -1);
};

/**
 * Helper methods for renaming / replacing template variables
 */

module.exports = CrudGenerator;