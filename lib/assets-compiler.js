var fs = require('fs');
var utils = require('./railway_utils');
var $ = utils.stylize.$;
var log = utils.debug;
var Module = require('module').Module;

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

    this.handleRequests(handledAssetTypes);
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
  log($('AssetsCompiler').bold + ' Precompiling assets: ' + assetTypes.join(', '));
};

/**
 * Listens to /stylesheets and /javascripts requests and
 * delegates the requests to the static middleware after
 * conditionally compiling the source files (e.g. coffee)
 *
 * @param {Array} List of asset types that should be compiled on request
 */
AssetsCompiler.prototype.handleRequests = function(assetTypes) {
  var self = this;
  var staticMiddleware = require('express').static(self.app.root + '/public');

  // Catch requests to /javascripts and /stylesheets
  this.app.get('/:folder(' + assetTypes.join('|') + ')/:file', function(req, res, next) {
    var folder = req.params.folder
      , fileName = req.params.file
      , options;

    switch (folder) {
      case 'javascripts':
        options = {
          compiler: 'coffee',
          match: /\.js$/,
          extension: '.coffee',
          sourceDir: self.app.root + '/app/assets/coffeescripts/',
          destDir: self.app.root + '/public/javascripts/' 
        };

        self.compileAsset(fileName, options, function() {
          staticMiddleware(req, res, next);
        });
        break;
      case 'stylesheets':
        options = {
          match: /\.css$/,
          sourceDir: self.app.root + '/app/assets/stylesheets/',
          destDir: self.app.root + '/public/stylesheets/'
        };

        if (self.app.settings.cssEngine == 'stylus') {
          options.compiler = 'stylus';
          options.extension = '.styl';
        } else if (self.app.settings.cssEngine == 'less') {
          options.compiler = 'less';
          options.extension = '.less';
        } else if (self.app.settings.cssEngine == 'sass') {
          options.compiler = 'sass';
          options.extension = '.sass';
        }

        self.compileAsset(fileName, options, function() {
          staticMiddleware(req, res, next);
        });
      default:
        staticMiddleware(req, res, next);
        break;
    }

  });
};

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
  coffee: function(str, fn) {
    var coffee = this.cache.coffee || (this.cache.coffee = this.require('coffee-script'));
    try {
      fn(null, coffee.compile(str));
    } catch (err) {
      fn(err);
    }
  },

  sass: function(str, fn) {
    var sass = this.cache.sass || (this.cache.sass = this.require('sass'));
    try {
      fn(null, sass.render(str));
    } catch (err) {
      fn(err);
    }
  },

  less: function(str, fn) {
    var less = this.cache.less || (this.cache.less = this.require('less'));
    try {
      less.render(str, fn);
    } catch (err) {
      fn(err);
    }
  },

  stylus: function(str, fn) {
    var stylus = this.cache.stylus || (this.cache.stylus = this.require('stylus'));
    try {
      stylus.render(str, fn);
    } catch (err) {
      fn(err);
    }
  }
};

/**
 * Checks for according source file, compiles it and saves the
 * compiled source if the destination file is older than the source
 * file or if the destination file doesnt exist
 *
 * @param {String} destination filename
 * @param {Object} options
 * @return {Boolean} whether a file has been compiled
 */
AssetsCompiler.prototype.compileAsset = function(destFileName, options, fn) {
  var compile;
  if (!(compile = this.compilers[options.compiler])) {
    log($('AssetsCompiler').bold + ' failed: Compiler ' + $(options.compiler).bold + ' not implemented');
    return fn(null, false);
  }

  // build paths
  var sourceFilename = destFileName.replace(options.match, options.extension);
  var sourcePath = options.sourceDir + sourceFilename
    , destPath = options.destDir + destFileName;

  // if `sourcePath` doesnt exist, we don't need to compile
  if (!fs.existsSync(sourcePath))
    return fn(null, false);

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

  // actually compile
  if (doCompile) {
    var code = fs.readFileSync(sourcePath).toString();
    compile.call(this, code, function(err, compiledCode) {
      if(err) {
        return fn(err);
      }

      fs.writeFileSync(destPath, compiledCode);

      fn(null, true);
      log($('Compiled').bold + ' ' + $(sourceFilename).cyan + ' => ' + $(destFileName).green);
    });
  } else {
    fn(null, false);
  }

  return doCompile;
};

module.exports = AssetsCompiler;