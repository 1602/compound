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
 * Generators need to distinguish text files from
 * binary files since it would will to replace variables
 * in the binary content. Add binary file extensions here.
 */
GeneratorUtilities.binaryExtensions = [ 'jpg', 'png', 'ico', 'gif' ];


/**
 * Create directory
 * @param {String} dir - dirname.
 * @private
 */
GeneratorUtilities.prototype.createDirectory = function (dir) {
    var displayDir = dir;
    if (this.options.appName && !this.createDirectory.rootCreated) {
        this.createDirectory.rootCreated = true;
        this.createDirectory('');
    }
    if (this.options.appName) {
        displayDir = path.join(this.options.appName, dir);
    }
    if (utils.existsSync(path.join(this.baseDir, dir))) {
        sys.puts($('exists').bold.grey + '  ' + displayDir);
    } else {
        fs.mkdirSync(path.join(this.baseDir, dir), 0755);
        sys.puts($('create').bold.green + '  ' + displayDir);
    }
};

/**
 * Generates template from extension package
 *
 * @param {String} Filename
 * @param {String} Destination filename
 * @param {Object} Variables
 */
GeneratorUtilities.prototype.copyTemplate = function(fileName, destFileName, variables, templateData) {
  var package = this.options.tpl + '-ext';
  var tpl = require(package);

  destFileName = this.replaceVariables(destFileName, variables);
  var fileDestPath = path.join(this.getRootPath(), destFileName);

  var displayFileName = destFileName;
  if (this.options.appName) {
    displayFileName = path.join(this.options.appName, displayFileName);
  }

  if(utils.existsSync(fileDestPath)) {
    sys.puts($('exists').bold.grey + '  ' + displayFileName);
  } else {
    var templateContent = tpl.templateText(fileName, templateData);
    if (!templateContent) {
      templateContent = fs.readFileSync(tpl.template(fileName)).toString();
    }

    var key
      , value
      , regexp;
    for(key in variables) {
      regexp = new RegExp(key, 'g');
      value = variables[key];

      templateContent = templateContent.replace(regexp, value);
    }

    fs.writeFileSync(fileDestPath, templateContent);

    sys.puts($('create').bold.green + '  ' + displayFileName);
  }
};

/**
 * Copy Kontroller file
 *
 * @param {String} Filename
 * @param {String} Destination filename
 * @param {Object} Variables
 */
GeneratorUtilities.prototype.copyController = function(fileName, destFileName, variables) {

  var kontroller = require('kontroller');

  fileName = this.replaceVariables(fileName, variables);
  destFileName = this.replaceVariables(destFileName, variables);

  var fileDestPath = path.join(this.getRootPath(), destFileName);

  var displayFileName = destFileName;
  if (this.options.appName) {
    displayFileName = path.join(this.options.appName, displayFileName);
  }

  if(utils.existsSync(fileDestPath)) {
    sys.puts($('exists').bold.grey + '  ' + displayFileName);
  } else {
    var templateContent = kontroller.getControllerTemplate(fileName);
    templateContent = this.replaceVariables(templateContent, variables);

    fs.writeFileSync(fileDestPath, templateContent);

    sys.puts($('create').bold.green + '  ' + displayFileName);
  }
};

/**
 * Reads file from Kontroller
 *
 * @param {String} Filename
 * @param {String} Destination filename
 * @param {Object} Variables
 *
 * @return {String} File contents (with replaced variables)
 */
GeneratorUtilities.prototype.readKontrollerFile = function(fileName, variables) {
  var kontroller = require('kontroller');
  fileName = this.replaceVariables(fileName, variables);

  return this.replaceVariables(
      kontroller.getControllerTemplate(fileName),
      variables
  );

};

/**
 * Copy file while replacing variables in filename
 * as well as in the actual file content.
 *
 * @param {String} Filename
 * @param {String} Destination filename (optional)
 * @param {Object} Variables
 */
GeneratorUtilities.prototype.copyFile = function (fileName, destFileName, variables) {
  if(typeof variables === 'undefined') {
    variables = destFileName;
    destFileName = fileName;
  }

  fileName = this.replaceVariables(fileName, variables);  
  destFileName = this.replaceVariables(destFileName, variables);

  var displayFileName = destFileName;
  var filePath = path.join(__dirname, '/../../../templates/', fileName);
  var fileDestPath = path.join(this.getRootPath(), destFileName);

  if (this.options.appName) {
    displayFileName = path.join(this.options.appName, displayFileName);
  }

  try {
    if (utils.existsSync(fileDestPath)) {
      sys.puts($('exists').bold.grey + '  ' + displayFileName);
    } else {
      var contents = fs.readFileSync(filePath);

      if(!this.hasBinaryExtension(fileName)) {
        contents = this.replaceVariables(contents.toString(), variables);
      }

      fs.writeFileSync(fileDestPath, contents);

      sys.puts($('create').bold.green + '  ' + displayFileName);
    }
  } catch (e) {

    console.log(e);
    
    sys.puts($('error').bold.red + '   ' + displayFileName);
  }
};

/**
 * Appends the content of a file to another file while
 * replacing the variables
 *
 * @param {String} Source filename
 * @param {String} Destination filename
 * @param {Object} Variables
 */
GeneratorUtilities.prototype.appendFileToFile = function(fileName, destFileName, variables) {
  fileName     = this.replaceVariables(fileName, variables);
  destFileName = this.replaceVariables(destFileName, variables);

  var filePath = path.join(__dirname, '/../../../templates/', fileName)
    , destFilePath = path.join(this.getRootPath(), destFileName);

  var appendableContent = fs.readFileSync(filePath).toString();
  appendableContent = this.replaceVariables(appendableContent, variables);

  var content = fs.readFileSync(destFilePath).toString();

  // Remove trailing line breaks from current content
  content =  content.replace(/\n+$/ig, '');
  content += '\n\n' + appendableContent + '\n';

  fs.writeFileSync(destFilePath, content);

  var displayFileName = destFileName;

  if (this.options.appName) {
    displayFileName = path.join(this.options.appName, displayFileName);
  }

  sys.puts($('patch').bold.blue + '   ' + displayFileName);
};

/**
 * Replaces variables in the given string and returns the new
 * string
 *
 * @param {String} The string that should be changed
 * @param {Object} The variables that should be replaced
 */
GeneratorUtilities.prototype.replaceVariables = function (str, variables) {
  var regexp
    , key
    , value;

  for(key in variables) {
    value = variables[key];

    regexp = new RegExp('\{\{ ' + key + ' \}\}', 'g');

    str = str.replace(regexp, value);
  }
  return str;
};

/**
 * Gets the root path, depending on whether an app name has been
 * set or not
 */
GeneratorUtilities.prototype.getRootPath = function() {
  return this.baseDir;
};

/**
 * Checks whether the given filename could have a binary
 * file extension
 *
 * @param {String} Filename
 */
GeneratorUtilities.prototype.hasBinaryExtension = function (fileName) {
  var fileExtension = fileName.split('.').pop().toLowerCase();
  return !!~GeneratorUtilities.binaryExtensions.indexOf(fileExtension);
}; 

/**
 * Generates a proper property format name using the given format type
 *
 * @param {String} Format type
 */
GeneratorUtilities.prototype.formatPropertyType = function (name) {
  name = (name || 'string').toLowerCase();
  switch (name) {
  case 'text': return 'Text';
  case 'string': return 'String';

  case 'date': return 'Date';

  case 'bool':
  case 'boolean': return 'Boolean';

  case 'int':
  case 'real':
  case 'float':
  case 'decimal':
  case 'number': return 'Number';
  }
  return '"' + camelize(name, true) + '"';
};

/**
 * Generates a string from the given parents and the model, seperated
 * by the join character
 *
 * @param {String} Prefix
 * @param {Array} Parents strings
 * @param {String} Model name
 * @param {Boolean} If true, function won't render attributes in brackets
 * @param {String} Separator string, defaults to '_'
 */
GeneratorUtilities.prototype.generateStringFromParents = function(prefix, parents, modelName, skipParams, separator) {
  var name;
  if (!separator) separator = '_';
  if (parents.length) {
    name = prefix + parents.join(separator) + separator + modelName;
  } else {
    name = prefix + modelName;
  }
  if (skipParams) return name;

  return name + '(' + parents.map(function (p) {
    return 'params.' + p + '_id';
  }).join(', ') + ')';
};

/**
 * Ensures existence of the given directories
 *
 * @param {Array} Parents
 * @param {String} Base directory
 */
GeneratorUtilities.prototype.createParentDirectories = function(parents, directory) {
  var self = this;
  parents.forEach(function(dir) {
    directory = path.join(directory, dir);
    self.createDirectory(directory);
  });
};

/**
 * Helper methods for renaming / replacing template variables
 */
GeneratorUtilities.prototype.getCSSEngineExtension = function () {
  var extensionsMap = {
    'sass':   'sass',
    'stylus': 'styl',
    'less':   'less'
  };
  return extensionsMap[this.options.css] || extensionsMap['stylus'];  
};

GeneratorUtilities.prototype.getCodeExtension = function () {
  return (this.options.coffee ? 'coffee' : 'js');
};

GeneratorUtilities.prototype.getTemplateExtension = function () {
  return this.options.tpl;
};

GeneratorUtilities.prototype.getDataExtension = function () {
  return (this.options.coffee ? 'yml' : 'json');
};

GeneratorUtilities.prototype.getTemplateEngine = function () {
  return this.options.tpl;
};

GeneratorUtilities.prototype.getCSSEngine = function () {
  return this.options.css || 'stylus';
};

GeneratorUtilities.prototype.getAppName = function() {
  return this.options.appName || path.basename(process.cwd());
};

GeneratorUtilities.prototype.getEngine = function() {
  return (this.options.coffee ? 'coffee' : 'node');
};

GeneratorUtilities.prototype.getDatabaseDriver = function() {
  return this.options.db || 'memory';
};

GeneratorUtilities.prototype.isEvalAllowed = function () {
  return !('noeval' in this.options);
};

GeneratorUtilities.prototype.generateSecret = function() {
  return require('crypto')
    .createHash('sha1')
    .update(Math.random().toString())
    .digest('hex');
};

module.exports = GeneratorUtilities;
