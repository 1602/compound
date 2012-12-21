/**
 * Builds docs from source files
 */
var exec = require('child_process').exec;
var watch = (process.argv[2] == '--watch')
  , command
  , cwd = process.cwd()
  , util = require('util');

/**
 * Compile jade files
 */
command = 'jade -P ' + (watch ? '-w ' : ' ') + '-O ' + cwd + ' ' + cwd + '/src';
var jadeProcess = exec(command);
jadeProcess.stdout.on('data', function (data) {
  util.print(data);
});

/**
 * Compile stylus files
 */
command = 'stylus ' + (watch ? '-w' : '') + ' -o ' + cwd + '/stylesheets ' + cwd + '/src/stylesheets/application.styl';
var stylusProcess = exec(command);
stylusProcess.stdout.on('data', function (data) {
  util.print(data);
});