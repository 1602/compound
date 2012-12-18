var fs = require('fs');
var coffee = require('coffee-script');
var utils = require('./railway_utils');
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

    this.handleRequests();
}

/**
 * Listens to /stylesheets and /javascripts requests and
 * delegates the requests to the static middleware after
 * conditionally compiling the source files (e.g. coffee)
 */
AssetsCompiler.prototype.handleRequests = function() {
  var self = this;
  var staticMiddleware = require('express').static(self.app.root + '/public');

  // Catch requests to /javascripts and /stylesheets
  this.app.get('/:folder(javascripts|stylesheets)/:file', function(req, res, next) {
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
 *   to AssetCompiler.prototype.compileAsset
 * {value} should be a function with two arguments:
 *   - the source code string
 *   - the callback function
 *     (two arguments: error, compiled code)
 */
AssetsCompiler.prototype.compilers = {
  coffee: function(str, fn) {
    try {
      fn(null, coffee.compile(str));
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
    log($('AssetCompiler').bold + ' failed: Compiler ' + $(options.compiler).bold + ' not implemented');
    return false;
  }

  // build paths
  var sourceFilename = destFileName.replace(options.match, options.extension);
  var sourcePath = options.sourceDir + sourceFilename
    , destPath = options.destDir + destFileName;

  // if `sourcePath` doesnt exist, we don't need to compile
  if (!fs.existsSync(sourcePath))
    return false;

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
    compile(code, function(err, compiledCode) {
      if(err) {
        return fn(err);
      }

      fs.writeFileSync(destPath, compiledCode);

      fn(null, true);
      log($('Compiled').bold + ' ' + $(sourceFilename).cyan + ' => ' + $(destFileName).green);
    });
  }

  return doCompile;
};

module.exports = AssetsCompiler;