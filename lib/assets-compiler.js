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
    this.assetDir = this.app.root + '/app/assets';
    this.publicDir = this.app.root + '/public';
    this.defaultCompilerOptions = {
      sourceDir: '',
      destDir: '',
    };
    this.addCompilers();
}

AssetsCompiler.prototype.init = function() {
  /** 
   * Decide which asset directories to watch and which should
   * be precompiled
   */
  var assetTypes = [{name: 'javascripts', extension: 'js'}, {name:'stylesheets', extension: 'css'}]
    , self = this;

  this.compound.on('after configure', function() {
    var precompileAssets = [];
    self.handledAssetTypes = [];

    assetTypes.forEach(function(assetType) {
      if (self.app.enabled('merge ' + assetType.name)) {
        precompileAssets.push(self.getCompiler(assetType.extension).sourceExtension);
      } else {
        self.handledAssetTypes.push(assetType.extension);
      }
    });
    
    if (precompileAssets.length > 0) {
      // Compile assets asynchronously
      process.nextTick(function() {
        self.precompileAssets(precompileAssets);
      });
    }
  });

  return this.handleRequest.bind(this);
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
AssetsCompiler.prototype.precompileAssets = function(sourceExtensions) {
  var self = this;

  log($('AssetsCompiler').bold + ' ' + $('Precompiling assets:').cyan + ' ' + sourceExtensions.join(', '));

  this.compound.utils.recursivelyWalkDir(this.assetDir, function(err, files) {
    if (err) throw err;

    files.forEach(function(file) {
      var match = file.match(new RegExp('^(.*)\/(.*)[.]('+sourceExtensions.join('|')+')$'));
      if(match) {
        var source = match[0]
          , folder = match[1]
          , fileName = match[2]
          , extension = match[3]
          , compiler = self.compilers[extension]
          , destFolder = folder.replace(self.assetDir+compiler.sourceDir, self.publicDir+compiler.destDir)
          , dest = destFolder + '/' + fileName + '.' + compiler.destExtension;
        
        self.compileAsset(source, dest, compiler, function(err) {
          if (err) {
            log($('AssetsCompiler').bold + ' ' + $('Compilation of ' + source.replace(self.assetDir, '') + ' failed: ').red + err);
          }
        });
      }
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
AssetsCompiler.prototype.handleRequest = function(req, res, next) {
  var match
    , path = this.publicDir + req.path;
  if (match = path.match(new RegExp('^(.*)\/(.*)[.]('+this.handledAssetTypes.join('|')+')$'))) {
    var dest = match[0]
      , folder = match[1]
      , fileName = match[2]
      , extension = match[3]
      , compiler = this.getCompiler(extension)
      , sourceFolder = folder.replace(self.publicDir+compiler.destDir, self.assetDir+compiler.sourceDir)
      , source = sourceFolder + '/' + fileName + '.' + compiler.sourceExtension;

    if(compiler) {
      this.compileAsset(source, dest, compiler, function(err) {
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
AssetsCompiler.prototype.compileAsset = function(sourcePath, destPath, compiler, callback) {
  var self = this;
  if (!callback) var callback = function() {};

  // options for compiler
    var options = {
      sourceDir:  sourcePath.match(/(.*)\/|\\/)[1],
      destDir: destPath.match(/(.*)\//)[1],
      sourceFileName: sourcePath.match(/([^/\\]+)$/)[1],
      destFileName: destPath.match(/([^/\\]+)$/)[1]
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
      log($('AssetsCompiler').bold + ' ' + $(options.sourceFileName).cyan + ' => ' + $(options.destFileName).green);
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
    sourceDir: '/coffeescripts',
    destDir: '/javascripts',
    sourceExtension: 'coffee',
    destExtension: 'js'
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
    sourceExtension: 'sass',
    destExtension: 'css'
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
    sourceExtension: 'less',
    destExtension: 'css'
  });

  this.add(['stylus', 'styl'], {
    render: function(str, options, fn) {
      var style;

      this.stylus = this.stylus || self.require('stylus');
      style = this.stylus(str, {paths: [options.sourceDir] });
      if(this.use) {
        var use = this.use instanceof Array ? this.use : [this.use];
        for(var i = 0; i < use.length; i++) {
          console.log(use);
          style.use(use[i]);
        }
      }
      try {
        style.render(fn);
      } catch (err) {
        fn(err);
      }
    },
    sourceExtension: 'styl',
    destExtension: 'css'
  });
}
