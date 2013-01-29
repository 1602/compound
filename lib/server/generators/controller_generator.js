/**
 * lib/generators/controller_generator.js
 *
 * @defines {ControllerGenerator}
 * @since {1.1.4}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Generates a kontroller controller
 * }
 */

/**
 * Module dependencies
 */
var util = require('util')
  , BaseGenerator = require('./base_generator')
  , path = require('path');

/**
 * Generates a kontroller controller
 * 
 * @constructor
 */
function ControllerGenerator () {
  ControllerGenerator.super_.call(this);
};
util.inherits(ControllerGenerator, BaseGenerator);

/**
 * Command line aliases
 */
ControllerGenerator.aliases = [ 'controller', 'ctrl', 'c' ];

/**
 * Default key name (first command line argument is stored in options[defaultKeyName])
 */
ControllerGenerator.prototype.defaultKeyName = 'controllerName';

/**
 * Performs the generator action
 *
 * @param {Array} arguments
 */
ControllerGenerator.prototype.perform = function (args) {
  BaseGenerator.prototype.perform.apply(this, arguments);

  this.createDirectoryStructure();
  this.generateController();
  this.copyFiles();
};

/**
 * Creates the basic directory structure
 */
ControllerGenerator.prototype.createDirectoryStructure = function () {
  var self = this;
  [ 
    'app/',
    'app/controllers/',
    'app/helpers/',
    'app/views/'
  ].forEach(function (dir) {
    self.createDirectory(dir);
  });

  var ns = this.options.controllerName.split('/');
  ns.pop();

  this.createParentDirectories(ns, 'app/controllers/');
  this.createParentDirectories(ns, 'app/helpers/');
  this.createParentDirectories(ns, 'app/views/');

  this.createDirectory('app/views/' + this.options.controllerName);
};

/**
 * Copy files from templates directory
 */
ControllerGenerator.prototype.copyFiles = function () {
  var self = this;

  var templateVariables = {
    'CODE': this.getCodeExtension(),
    'TPL':  this.getTemplateExtension(),
    'CONTROLLER': this.options.controllerName
  };

  this.copyFile('app/helpers/model_helper.{{ CODE }}', 'app/helpers/{{ CONTROLLER }}_helper.{{ CODE }}', templateVariables);

  this.options.forEach(function (action) {
    templateVariables['ACTION'] = action;
    var templateData = [self.options.controllerName, action];
    self.copyTemplate('default_action_view', 'app/views/{{ CONTROLLER }}/{{ ACTION }}.{{ TPL }}', templateVariables, templateData);
  });
};

/**
 * Generates the controller actions and creates the controller
 */
ControllerGenerator.prototype.generateController = function() {
  var self = this;
  var templateVariables = {
    'CONTROLLER': this.options.controllerName,
    'CODE':       this.getCodeExtension()
  };

  var actions = []
    , actionText;
  this.options.forEach(function (actionName) {
    templateVariables['ACTION'] = actionName;

    actionText = self.readKontrollerFile('action_eval.{{ CODE }}', templateVariables);
    actions.push(actionText);
  });

  templateVariables['ACTIONS'] = actions.join('\n\n');
  this.copyController('controller_eval.{{ CODE }}', 'app/controllers/' + this.options.controllerName + '_controller.{{ CODE }}', templateVariables)
};

/**
 * Helper methods for renaming / replacing template variables
 */

module.exports = ControllerGenerator;
