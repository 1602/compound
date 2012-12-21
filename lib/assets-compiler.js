var fs = require('fs')
  , path = require('path')
  , Module = require('module').Module
  , utils = require('./utils');

var $ = utils.stylize.$;
var log = utils.debug;

/**
 * Assets compilation engine
 * Waits for requests to public assets folders and compiles
 * the files if needed
 *
 * @constructor
 */
function AssetsCompiler(rw) {
    this.railway = rw;
    this.app = this.railway.app;
    this.cache = {};
    this.cssEngine = this.app.settings.cssEngine || 'stylus';
}

AssetsCompiler.prototype.init = function() {
    /** 
     * Decide which asset directories to watch and which should
     * be precompiled
     */
    var self = this
      , precompiledAssetTypes = []
      , handledAssetTypes = [];

    ['javascripts', 'stylesheets'].forEach(function(assetType) {
      if (self.app.enabled('merge ' + assetType)) {
        precompiledAssetTypes.push(assetType);
      } else {
        handledAssetTypes.push(assetType);
      }
    });

    if (precompiledAssetTypes.length > 0) {
      // Compile assets asynchronously
      process.nextTick(function() {
        self.precompileAssets(precompiledAssetTypes);
      });
    }

    var self = this;
    return function(req, res, next) {
      self.handleRequest(req, res, next, handledAssetTypes);
    };
};

AssetsCompiler.prototype.require = function(module) {
  return Module._load(module, {
    paths: [this.railway.root + '/node_modules', __dirname + '/../node_modules']
  });
};

/**
 * Precompiles assets in /app/assets/coffeescripts and /app/assets/stylesheets
 * 
 * @param {Array} List of asset types that should be precompiled
 */
AssetsCompiler.prototype.precompileAssets = function(assetTypes) {
  log($('AssetsCompiler').bold + ' ' + $('Precompiling assets:').cyan + ' ' + assetTypes.join(', '));

  var self = this;
  assetTypes.forEach(function(assetType) {
    var options = self.getCompilerOptions(assetType);
    self.railway.utils.recursivelyWalkDir(options.sourceDir, options.destExtension, function(err, files) {
      if (err) throw err;

      files.forEach(function(file) {
        var relativeFilePath = file.replace(options.sourceDir, '');
        
        self.compileAsset(relativeFilePath, options, function(err) {
          if (err) {
            log($('AssetsCompiler').bold + ' ' + $('Compilation of ' + relativeFilePath + ' failed: ').red + err);
          }
        });
      });
    });
  });
};

/**
 * Listens to /stylesheets and /javascripts requests and
 * delegates the requests to the static middleware after
 * conditionally compiling the source files (e.g. coffee)
 *
 * @param {Array} List of asset types that should be compiled on request
 */
AssetsCompiler.prototype.handleRequest = function(req, res, next, assetTypes) {
  var self = this;
  var staticMiddleware = require('express').static(this.app.root + '/public');
  var match;

  if (match = req.path.match(new RegExp('^/(' + assetTypes.join('|') + ')/(.*)'))) {
    var folder = match[1]
      , fileName = match[2];

    switch (folder) {
      case 'javascripts':
      case 'stylesheets':
        var options = self.getCompilerOptions(folder);

        fileName = fileName.replace(new RegExp(options.destExtension + '$'), options.sourceExtension);

        self.compileAsset(fileName, options, function(err) {
          if (err) {
            throw new Error('Asset compilation failed: ' + err);
          }

          next();
        });
        break;
      default:
        next();
        break;
    }
  } else {
    next();
  }

  // Catch requests to /javascripts and /stylesheets
  // this.app.get('/:folder(' +  + ')/:file', function(req, res, next) {
  

  // });
};

AssetsCompiler.prototype.getCompilerOptions = function (assetType) {
  if (assetType === 'javascripts') {
    return {
      compiler: 'coffee',
      sourceExtension: '.coffee',
      sourceDir: this.app.root + '/app/assets/coffeescripts',
      destDir: this.app.root + '/public/javascripts',
      destExtension: '.js'
    };
  } else if (assetType === 'stylesheets') {
    var options = {
      sourceDir: this.app.root + '/app/assets/stylesheets',
      destExtension: '.css',
      destDir: this.app.root + '/public/stylesheets'
    };

    if (this.app.settings.cssEngine == 'stylus') {
      options.compiler = 'stylus';
      options.sourceExtension = '.styl';
    } else if (this.app.settings.cssEngine == 'less') {
      options.compiler = 'less';
      options.sourceExtension = '.less';
    } else if (this.app.settings.cssEngine == 'sass') {
      options.compiler = 'sass';
      options.sourceExtension = '.sass';
    }

    return options;
  }
}

/**
 * Available compilers
 * 
 * {key} should be the `compiler` option passed 
 *   to AssetsCompiler.prototype.compileAsset
 * {value} should be a function with two arguments:
 *   - the source code string
 *   - the callback function
 *     (two arguments: error, compiled code)
 */
AssetsCompiler.prototype.compilers = {
  coffee: function(str, options, fn) {
    var coffee = this.cache.coffee || (this.cache.coffee = this.require('coffee-script'));
    try {
      fn(null, coffee.compile(str));
    } catch (err) {
      fn(err);
    }
  },

  sass: function(str, options, fn) {
    var sass = this.cache.sass || (this.cache.sass = this.require('sass'));
    try {
      fn(null, sass.render(str));
    } catch (err) {
      fn(err);
    }
  },

  less: function(str, options, fn) {
    var less = this.cache.less || (this.cache.less = this.require('less'));
    try {
      var parser = new(less.Parser)({
          paths: [options.sourceDir]
      });
      parser.parse(str, function (e, tree) {
        if (e) {throw e;}
        fn(null, tree.toCSS());
      });
    } catch (err) {
      fn(err);
    }
  },

  stylus: function(str, options, fn) {
    var stylus = this.cache.stylus || (this.cache.stylus = this.require('stylus'));
    try {
      stylus.render(str, {paths: [options.sourceDir]}, fn);
    } catch (err) {
      fn(err);
    }
  }
};

/**
 * Checks for source file, compiles it and saves the
 * compiled source if the destination file is older than the source
 * file or if the destination file doesnt exist
 *
 * @param {String} Source file name
 * @param {Object} options
 * @return {Boolean} whether a file has been compiled
 */
AssetsCompiler.prototype.compileAsset = function(sourceFileName, options, callback) {
  var compile
    , self = this;
  if (!callback) var callback = function() {};
  if (!(compile = this.compilers[options.compiler])) {
    log($('AssetsCompiler').bold + ' ' + $('Compiler ' + $(options.compiler).bold + ' not implemented').red);
    return callback(null, false);
  }

  // build paths
  var destFileName = sourceFileName.replace(new RegExp(options.sourceExtension + '$'), options.destExtension);
  var sourcePath = options.sourceDir + '/' + sourceFileName
    , destPath = options.destDir + '/' + destFileName;

  // if `sourcePath` doesnt exist, we don't need to compile
  if (!fs.existsSync(sourcePath)) {
    return callback(null, false);
  }

  // if `destPath` doesnt exist or `sourcePath` is older than `destPath`
  //   => compile!
  var doCompile = false;

  if (fs.existsSync(destPath)) {
    var destStat = fs.statSync(destPath)
      , sourceStat = fs.statSync(sourcePath);

    if (sourceStat.mtime > destStat.mtime) {
      doCompile = true;
    }
  } else {
    doCompile = true;
  }

  // make sure that the destination path exists
  // actually compile
  if (doCompile) {
    self.railway.utils.ensureDirectoryExists(path.dirname(destPath));

    var code = fs.readFileSync(sourcePath).toString();
    compile.call(this, code, options, function(err, compiledCode) {
      if(err) {
        return callback(err);
      }

      fs.writeFileSync(destPath, compiledCode);

      callback(null, true);
      log($('AssetsCompiler').bold + ' ' + $(sourceFileName).cyan + ' => ' + $(destFileName).green);
    });
  } else {
    callback(null, false);
  }

  return doCompile;
};

module.exports = AssetsCompiler;
