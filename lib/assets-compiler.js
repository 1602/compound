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
var AssetsCompiler = module.exports = function AssetsCompiler(compound) {
    this.compound = compound;
    this.app = this.compound.app;
    this.defaultCompilerOptions = {
      sourceDir: this.app.root + '/app/assets',
      destDir: this.app.root + '/public',
    };
    this.addCompilers();
}

AssetsCompiler.prototype.init = function() {
    /** 
     * Decide which asset directories to watch and which should
     * be precompiled
     */
    var self = this
      , precompiledAssetTypes = []
      , handledAssetTypes = [];


    [{name: 'javascripts', extension: 'js'}, 
      {name:'stylesheets', extension: 'css'}].forEach(function(assetType) {
      if (self.app.enabled('merge ' + assetType.name)) {

        precompiledAssetTypes.push(assetType.extension);
      } else {
        handledAssetTypes.push(assetType.extension);
      }
    });

    if (precompiledAssetTypes.length > 0) {
      // Compile assets asynchronously
      process.nextTick(function() {
        self.precompileAssets(precompiledAssetTypes);
      });
    }
    return function(req, res, next) {
      self.handleRequest(req, res, next, handledAssetTypes);
    };
};

AssetsCompiler.prototype.require = function(module) {
  return Module._load(module, {
    paths: [this.compound.root + '/node_modules', __dirname + '/../node_modules']
  });
};

/**
 * Precompiles assets in /app/assets/coffeescripts and /app/assets/stylesheets
 * 
 * @param {Array} List of asset types that should be precompiled
 */
AssetsCompiler.prototype.precompileAssets = function(assetExtensions) {
  log($('AssetsCompiler').bold + ' ' + $('Precompiling assets:').cyan + ' ' + assetExtensions.join(', '));

  var self = this;
  assetExtensions.forEach(function(extension) {
    var compiler = self.getCompiler(extension);
    self.compound.utils.recursivelyWalkDir(compiler.sourceDir, function(err, files) {
      if (err) throw err;

      files.forEach(function(file) {
        var relativeFilePath = file.replace(compiler.sourceDir, '')
          , match = relativeFilePath.match(new RegExp('^(.*)\/(.*)('+compiler.sourceExtension+')$'))
        if(match) {
          var folder = match[1]
            , fileName = match[2];

          self.compileAsset(fileName, folder, compiler, function(err) {
            if (err) {
              log($('AssetsCompiler').bold + ' ' + $('Compilation of ' + relativeFilePath + ' failed: ').red + err);
            }
          });
        }
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
AssetsCompiler.prototype.handleRequest = function(req, res, next, assetExtensions) {
  var match;
  if (match = req.path.match(new RegExp('^(.*)\/(.*)[.]('+assetExtensions.join('|')+')$'))) {
    var folder = match[1]
      , fileName = match[2]
      , extension = match[3]
      , compiler = this.getCompiler(extension);
    if(compiler) {
      this.compileAsset(fileName, folder, compiler, function(err) {
        if (err) {
          throw new Error('Asset compilation failed: ' + err);
        }
      });
    }
  }
  next();
};

/**
* Returns the correct Compiler for the given extension
* @param {String} extension
*/
AssetsCompiler.prototype.getCompiler = function(extension) {
  var compiler, compilerName;
  switch (extension) {
    case 'js':
      compilerName = this.app.settings.jsEngine || 'coffee';
      break;
    case 'css':
      compilerName = this.app.settings.cssEngine || 'stylus';
      break;
    default:
      break;
  }
  if(!(compiler = this.compilers[compilerName])) {
    log($('AssetsCompiler').bold + ' ' + $('Compiler ' + $(compilerName).bold + ' not implemented').red);
  }
  return compiler;
}

/**
 * Checks for source file, compiles it and saves the
 * compiled source if the destination file is older than the source
 * file or if the destination file doesnt exist
 *
 * @param {String} filename of asset without extension
 * @param {String} relative path to folder containing asset
 * @param {Object} compiler
 * @return {Boolean} whether a file has been compiled
 */
AssetsCompiler.prototype.compileAsset = function(fileName, folder, compiler, callback) {
  var self = this;
  if (!callback) var callback = function() {};

  // build paths
  var destFileName = fileName + compiler.destExtension
    , sourceFileName = fileName + compiler.sourceExtension
    , sourcePath = compiler.sourceDir + folder + '/' + sourceFileName
    , destPath = compiler.destDir + folder +'/' + destFileName
    , options = {
      sourceDir:  compiler.sourceDir + folder,
      destDir: compiler.destDir + folder,
      sourceFileName: sourceFileName,
      destFileName: destFileName
    };

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
    self.compound.utils.ensureDirectoryExists(path.dirname(destPath));

    var code = fs.readFileSync(sourcePath).toString();
    compiler.render(code, options, function(err, compiledCode) {
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

AssetsCompiler.prototype.compilers = {};

/**
* Adds a new compiler.
* @param {String||[String,...]} extensions: string or array of strings that represent 
*   the extensions this compiler handles
* @param {Object} options: should contain a render function, and any other options for the compiler
*/
AssetsCompiler.prototype.add = function(extensions, options) {
  extensions = extensions instanceof Array ? extensions : [extensions],
  self = this;
  extensions.forEach(function(extension) {
    self.compilers[extension] = {};
    self.configure(extension, self.defaultCompilerOptions);
    self.configure(extension, options);
  });
  return this;
}

/**
* Configuers an existing compiler
* @param {String} extension: the extension for the compiler to be configured
* @param {Object} options: the options to be set on the compiler object
*/
AssetsCompiler.prototype.configure = function(extension, options) {
  var compiler = this.compilers[extension];
  if(compiler) {
    for(key in options) {
      if(options.hasOwnProperty(key) ) {
        compiler[key] = options[key];
      }
    }
  }
  return this;
}

/**
 * Add Available compilers
 */
AssetsCompiler.prototype.addCompilers = function() {
  var self = this;
  this.add('coffee', {
    render: function(str, options, fn) {
      this.coffee =  this.coffee || self.require('coffee-script');
      try {
        fn(null, this.coffee.compile(str));
      } catch (err) {
        fn(err);
      }
    },
    sourceExtension: '.coffee',
    destExtension: '.js'
  });

  this.add('sass', {
    render: function(str, options, fn) {
      this.sass = this.sass || self.require('sass');
      try {
        fn(null, this.sass.render(str));
      } catch (err) {
        fn(err);
      }
    },
    sourceExtension: '.sass',
    destExtension: '.css'
  });

  this.add('less', {
    render: function(str, options, fn) {
      this.less = this.less || self.require('less');
      try {
        var parser = new(this.less.Parser)({
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
    sourceExtension: '.less',
    destExtension: '.css'
  });

  this.add('stylus', {
    render: function(str, options, fn) {
      var style,
          use = this.use instanceof Array ? this.use : [this.use];
      this.stylus = this.stylus || self.require('stylus');
      style = this.stylus(str, {paths: [options.sourceDir] });
      for(var i = 0; i < use.length; i++) {
        style.use(use[i]);
      }
      try {
        style.render(fn);
      } catch (err) {
        fn(err);
      }
    },
    sourceExtension: '.styl',
    destExtension: '.css'
  });
}
