// Stylize a string
function stylize(str, style) {
    var styles = {
        'bold'      : [1,  22],
        'italic'    : [3,  23],
        'underline' : [4,  24],
        'cyan'      : [96, 39],
        'yellow'    : [33, 39],
        'green'     : [32, 39],
        'red'       : [31, 39],
        'grey'      : [90, 39],
        'green-hi'  : [92, 32],
    };
    return '\033[' + styles[style][0] + 'm' + str +
           '\033[' + styles[style][1] + 'm';
};

var $ = function (str) {
    str = new(String)(str);

    ['bold', 'grey', 'yellow', 'red', 'green', 'white', 'cyan', 'italic', 'underline'].forEach(function (style) {
        Object.defineProperty(str, style, {
            get: function () {
                return $(stylize(this, style));
            }
        });
    });
    return str;
};

function create_dir (dir) {
    var root = process.cwd();
    if (path.existsSync(root + '/' + dir)) {
        sys.puts($('exists').bold.grey + '  ' + dir);
    } else {
        fs.mkdirSync(root + '/' + dir, 0755);
        sys.puts($('create').bold.green + '  ' + dir);
    }
}

function create_file (filename, contents) {
    var root = process.cwd();
    if (path.existsSync(root + '/' + filename)) {
        sys.puts($('exists').bold.grey + '  ' + filename);
    } else {
        fs.writeFileSync(root + '/' + filename, contents);
        sys.puts($('create').bold.green + '  ' + filename);
    }
}

function create_parents(ns, d) {
    ns.forEach(function (dir) {
        d += dir + '/';
        create_dir(d);
    });
}

var fs = require('fs');
var sys = require('sys');
var path = require('path');
var generators = {
    model: function (args) {
        var model = args.shift();
        if (!model) { 
            sys.puts($('Model name required').red.bold);
            return;
        }
        var Model = model[0].toUpperCase() + model.slice(1);
        var attrs = [];
        args.forEach(function (arg) {
            attrs.push('    "' + arg.split(':')[0] + '": "' + arg.split(':')[1] + '"\n');
        });
        create_dir('app/');
        create_dir('app/models/');
        create_file('app/models/' + model + '.js', 'function ' + Model + ' () {\n}\n\n' +
            Model + '.attributes = {\n' + attrs.join('') + '};'
        );
    },
    controller: function (args) {
        var controller = args.shift();
        if (!controller) {
            sys.puts($('Controller name required').red.bold);
            return;
        }

        var ns = controller.split('/');
        ns.pop();

        var actions = [];
        args.forEach(function (action) {
            actions.push('    ' + action + ': function (req, next) {\n    }');
        });

        create_dir('app/');
        create_dir('app/controllers/');
        create_parents(ns, 'app/controllers/');

        // controller
        var filename = 'app/controllers/' + controller + '_controller.js';
        create_file(filename, 'module.exports = {\n' + actions.join(',\n') + '\n};');

        create_dir('app/helpers/');
        create_parents(ns, 'app/helpers/');

        // helper
        filename = 'app/helpers/' + controller + '_helper.js';
        create_file(filename, 'module.exports = {\n};');

        // views
        create_dir('app/views/');
        create_parents(ns, 'app/views/');
        create_dir('app/views/' + controller + '/');
        args.forEach(function (action) {
            create_file('app/views/' + controller + '/' + action + '.ejs', '');
        });
    }
};

var args = process.argv.slice(2);
switch (args.shift()) {
case 'h':
case 'help':
    sys.puts('\nUsage: railway command [argument(s)]\n\n' +
    '  command is:\n' + 
    '    h or help        -- prints this message\n' +
    '    init             -- initialize railway directory structure\n' +
    '    generate [smth]  -- generate smth (model, controller)\n\n');
    process.exit(0);
    break;
case 'init':
    [ 'app/',
      'app/models/',
      'app/controllers/',
      'app/helpers/',
      'app/views/',
      'config/'
    ].forEach(create_dir);
    create_file('config/routes.js', 'exports.routes = function (map) {\n};');
    create_file('config/requirements.json', fs.readFileSync(__dirname + '/../templates/requirements.json'));
    create_file('Jakefile', fs.readFileSync(__dirname + '/../templates/tasks.js'));

    // patch app.js
    var filename = process.cwd() + '/app.js';
    if (path.existsSync(filename)) {
        var app = fs.readFileSync(filename).toString();
        if (!app.match('express-on-railway')) {
            app = app.replace(/(\/\/ Only listen on \$ node app\.js)/, 'require("express-on-railway").init(__dirname, app);\n\n$1');
            fs.writeFileSync(filename, app);
            sys.puts($('patch').bold.green + '   app.js');
        } else {
            sys.puts($('patched').bold.grey + ' app.js');
        }
    } else {
        sys.puts($('missing').bold.red + ' app.js');
    }
    break;
case 'generate':
    var what = args.shift();
    if (generators[what]) {
        generators[what](args);
    }
    break;
}

process.exit(0);
