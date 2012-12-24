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
    destFileName = null;
  }

  fileName = this.replaceVariables(fileName, variables);
  var displayFileName = fileName;
  var filePath = path.join(__dirname, '/../../templates/', fileName);
  var fileDestPath = path.join(this.getRootPath(), fileName);

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
    sys.puts($('error').bold.red + '   ' + displayFileName);
  }
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
    
    regexp = new RegExp('\{\{ ' + key + ' \}\}', 'ig');
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
  return (this.options.coffee ? 'yml' : 'js');
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

GeneratorUtilities.prototype.generateSecret = function() {
  return require('crypto')
    .createHash('sha1')
    .update(Math.random().toString())
    .digest('hex');
};

module.exports = GeneratorUtilities;