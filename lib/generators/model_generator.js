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
  , BaseGenerator = require('./base_generator')
  , utils = require('../utils')
  , camelize = utils.camelize;

/**
 * Generates a model
 * 
 * @constructor
 */
function ModelGenerator () {
  ModelGenerator.super_.call(this);
};
util.inherits(ModelGenerator, BaseGenerator);

/**
 * Command line aliases
 */
ModelGenerator.aliases = [ 'model', 'm' ];

/**
 * Default key name (first command line argument is stored in options[defaultKeyName])
 */
ModelGenerator.prototype.defaultKeyName = 'modelName';

/**
 * Performs the generator action
 *
 * @param {Array} arguments
 */
ModelGenerator.prototype.perform = function (args) {
  BaseGenerator.prototype.perform.apply(this, arguments);

  if (!!~this.options.modelName.indexOf('.')) {
    this.options.modelName = this.options.modelName.split('.').pop();
  }

  this.validateModelName();
  this.createDirectoryStructure();
  this.generateModel();
  this.appendSchema();
};

/**
 * Generates the model code
 */
ModelGenerator.prototype.generateModel = function () {
  var templateVariables = {
    'MODELNAME': camelize(this.options.modelName, true),
    'CODE':      this.getCodeExtension()
  };

  this.copyFile('app/models/model.{{ CODE }}'
    , 'app/models/' + this.options.modelName + '.{{ CODE }}'
    , templateVariables);
};

/**
 * Appends a describe() call to the schema
 */
ModelGenerator.prototype.appendSchema = function () {
  var properties = this.parseProperties();

  var templateVariables = {
    'MODELNAME':  camelize(this.options.modelName, true),
    'PROPERTIES': this.buildPropertiesCode(properties),
    'CODE':       this.getCodeExtension()
  };

  this.appendFileToFile('db/schema_model.{{ CODE }}', 'db/schema.{{ CODE }}', templateVariables);
};

/**
 * Parse properties from command line options
 */
ModelGenerator.prototype.parseProperties = function() {
  var properties = []
    , self = this;

  this.options.forEach(function (argument) {
    var property = argument.split(':')[0]
      , plainType = argument.split(':')[1]
      , type = self.formatPropertyType(plainType);

    properties.push({ name: property, plainType: plainType, type: type });
  });
  return properties;
};

/**
 * Build properties code form properties for the model
 */
ModelGenerator.prototype.buildPropertiesCode = function(properties) {
  var propertiesCode = []
    , self = this;
  properties.forEach(function (property){
    if (self.options.coffee) {
      propertiesCode.push('    property \'' + property.name + '\', ' + property.type);
    } else {
      propertiesCode.push('    property(\'' + property.name + '\', ' + property.type + ');');
    }
  });
  return propertiesCode.join('\n');
};

/**
 * Creates the basic directory structure
 */
ModelGenerator.prototype.createDirectoryStructure = function () {
  var self = this;
  [ 
    'app/',
    'app/models/'
  ].forEach(function (dir) {
    self.createDirectory(dir);
  });
};

/**
 * Validates the model name
 */
ModelGenerator.prototype.validateModelName = function() {
  var model = this.options.modelName;
  if (!model.match(/^[a-z][a-z0-9]*$/i)) {
    throw new Error('Model name could contain only letters and numbers and should start with letter');
  }
  if (!model) {
    sys.puts($('Model name required').red.bold);
    return;
  }
  if (model.match(/\//)) {
    model = model.match(/\/([^\/]+)$/)[1];
  }
  if (model.match(/\./)) {
    model = model.match(/\.([^\.]+)$/)[1];
  }
};

module.exports = ModelGenerator;