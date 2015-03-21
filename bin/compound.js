#!/usr/bin/env node

var sys = require('util');
var fs = require('fs');

try {
    var package = require(process.cwd() + '/package.json');
    if (package && !package.main) {
        console.log('Please fill `main` field in your `package.json` file');
        process.exit();
    }
    if (package.main.match(/\.coffee$/)) {
        require('coffee-script/register');
    }
    instantiateApp = require(process.cwd());
} catch(e) {
    instantiateApp = null;
}

var app, compound;
if (typeof instantiateApp === 'function') {
    app = instantiateApp();
    compound = app.compound;
}
if (!compound) {
    var Compound = require('../').Compound;
    compound = new Compound();
}

compound.init();

var args = process.argv.slice(2);
var exitAfterAction = true;
var command = args.shift();

switch (command) {
  default:
  case 'h':
  case 'help':
      if (command && command !== 'help' && command !== 'h') {
          var found = false;
          Object.keys(compound.tools).forEach(runner(compound.tools));
          function runner(base) {
              return function (cmd) {
                  if (!base) {
                      return false;
                  }
                  var c = base[cmd];
                  if (cmd === command || (c && c.help && c.help.shortcut === command)) {
                      if (cmd !== 'server' && cmd !== 's') {
                          compound.app.enable('tools');
                      }
                      exitAfterAction = false;
                      c(compound, args);
                      found = true;
                  }
              }
          }

          if (found) {
              break;
          }
      }
      var topic = args.shift();
      if (topic) {
          showMan(topic);
          return;
      }
      var help = [
          'Usage: compound command [argument(s)]\n',
          'Commands:'
      ];
      var commands = [
          ['h', 'help [topic]',    'Display compound man page'],
          ['i', 'init',            'Initialize compound app'],
          ['g', 'generate [smth]', 'Generate something awesome']
      ];
      Object.keys(compound.tools).forEach(function (cmd) {
          var h = compound.tools[cmd].help;
          if (h) {
              commands.push([h.shortcut || '', h.usage || cmd, h.description]);
          }
      });
      var maxLen = 0, addSpaces = compound.utils.addSpaces;
      commands.forEach(function (cmd) {
          if (cmd[1].length > maxLen) {
              maxLen = cmd[1].length;
          }
      });
      commands.forEach(function (cmd) {
          help.push('  ' + addSpaces(cmd[0] + ',', 4) + addSpaces(cmd[1], maxLen + 1) + cmd[2]);
      });
      compound.generators.init(compound, args);
      help.push('\nAvailable generators:\n');
      help.push('  ' + compound.generators.list());
      sys.puts(help.join('\n'));
      break;

  case 'i':
  case 'init':
      compound.generators.init(compound);
      compound.generators.perform('app', args);
      break;
  case 'g':
  case 'generate':
      var what = args.shift();
      compound.generators.init(compound);
      if (typeof what == "undefined" || what == null) {
          console.log('Generator not specified, available generators: ', compound.generators.list());
      } else {
          exitAfterAction = !compound.generators.perform(what, args);
      }
      break;
  case '--version':
      console.log(compound.version);
      break;
  }

  if (exitAfterAction) {
      process.exit(0);
  }

function showMan(topic) {
    var manDir = require('path').resolve(__dirname + '/../man');
    require('child_process').spawn(
        'man', [manDir + '/' + topic + '.3'],
        {
            customFds: [0, 1, 2],
            env: process.env,
            cwd: process.cwd()
        }
    );
}

/*vim ft:javascript*/
