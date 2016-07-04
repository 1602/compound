/**
 * lib/installer.js
 *
 * @defines {Installer}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Can install additional compound modules
 * }
 */

var exec = require('child_process').exec,
    util = require('util'),
    path = require('path'),
    fs = require('fs');

/**
 * Installer class
 * Can install additional compound modules
 *
 * @constructor
 */
function Installer () {}

/**
 * Initialization
 *
 * @param {Compound} Compound app
 */
Installer.prototype.init = function init(compound) {
  this.compound = compound;
  this.app = compound.app;
};

Installer.prototype.install = function(packageName) {
  var $ = this.app.compound.utils.stylize.$;
  var self = this;
  this.npmInstall(packageName, function (statusCode) {
    if(statusCode !== 0) {
      return console.log('\n`npm install` exited with status code', statusCode);
    }

    util.puts($('install').bold.green + ' co-' + packageName);

    self.patchAutoload(packageName);
  });
};

Installer.prototype.npmInstall = function(packageName, callback) {
  var npm = exec('npm install co-' + packageName + ' --save --color=always');
  npm.stdout.pipe(process.stdout);
  npm.stderr.pipe(process.stderr);
  npm.on('exit', function (statusCode) {
    callback(statusCode);
  });
};

Installer.prototype.patchAutoload = function(packageName) {
    var autoloadFile,
        autoloadPath,
        $ = this.app.compound.utils.stylize.$,
        regex, match, data, defaultModules;

    if (this.app.enabled('coffee')) {
        autoloadFile = 'config/autoload.coffee';

        autoloadPath = path.resolve(process.cwd(), autoloadFile);

        data = fs.readFileSync(autoloadPath).toString();

        // convert newlines to unicode character so that match works
        data = data.replace(/\n/g, '\uffff');

        regex = /defaultModules = \[(.*?)\]/i;
        match = data.match(regex);

        // Get current defaultModules
        defaultModules = match[1];
        defaultModules = defaultModules.replace(/\uffff/g, '\n').trim();

        // Add new defaultModule
        defaultModules += ',\n    \'co-' + packageName + '\'';

        // replace defaultModules
        data = data.replace(regex, 'defaultModules = [\n    ' + defaultModules + '\n  ]');
        data = data.replace(/\uffff/g, '\n');

        fs.writeFileSync(autoloadPath, data);
    } else {
        autoloadFile = 'config/autoload.js';
        autoloadPath = path.resolve(process.cwd(), autoloadFile);

        data = fs.readFileSync(autoloadPath).toString();

        // convert newlines to unicode character so that match works
        data = data.replace(/\n/g, '\uffff');

        regex = /defaultModules = \[(.*?)\]/i;
        match = data.match(regex);

        // Get current defaultModules
        defaultModules = match[1];
        defaultModules = defaultModules.replace(/\uffff/g, '\n').trim();

        // Add new defaultModule
        defaultModules += ',\n      \'co-' + packageName + '\'';

        // replace defaultModules
        data = data.replace(regex, 'defaultModules = [\n      ' + defaultModules + '\n    ]');
        data = data.replace(/\uffff/g, '\n');

        fs.writeFileSync(autoloadPath, data);
    }

    util.puts($('patch').bold.blue + '   ' + autoloadFile);

    process.exit(0);
};

module.exports = new Installer();
