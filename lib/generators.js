var pluralize = railway.utils.pluralize,
    camelize  = railway.utils.camelize,
    $         = railway.utils.stylize.$,
    options   = {},
    path      = require('path'),
    fs        = require('fs'),
    sys = require('sys');

function parseOptions (defaultKeyName) {
    options = {};
    var key = defaultKeyName || 'operand';
    args.forEach(function (arg) {
        if (arg.slice(0, 2) == '--') {
            key = arg.slice(2);
            options[key] = true;
        } else if (arg[0] == '-') {
            key = arg.slice(1);
            options[key] = true;
        } else {
            options[key] = arg;
        }
    });
}

function createDir (dir) {
    var root = process.cwd();
    if (options.appname && !createDir.rootCreated) {
        createDir.rootCreated = true;
        createDir('');
    }
    if (options.appname) {
        dir = options.appname + '/' + dir;
    }
    if (path.existsSync(root + '/' + dir)) {
        sys.puts($('exists').bold.grey + '  ' + dir);
    } else {
        fs.mkdirSync(root + '/' + dir, 0755);
        sys.puts($('create').bold.green + '  ' + dir);
    }
}

function appendToFile (filename, contents) {
    var root = process.cwd() + '/',
        fd = fs.openSync(root + filename, 'a');
    fs.writeSync(fd, contents);
    fs.closeSync(fd);
}

function createFile (filename, contents) {
    var root = process.cwd();
    if (options.appname) {
        filename = options.appname + '/' + filename;
    }
    var fullPath = root + '/' + filename;
    if (path.existsSync(fullPath)) {
        sys.puts($('exists').bold.grey + '  ' + filename);
    } else {
        fs.writeFileSync(fullPath, contents);
        sys.puts($('create').bold.green + '  ' + filename);
    }
    return fullPath;
}

function createFileByTemplate (filename, template, prepare) {
    if (!template.match(/\..+$/)) {
        var ext = options.coffee ? '.coffee' : '.js';
        template += ext;
        filename += ext;
    }
    var text = fs.readFileSync(__dirname + '/../templates/' + template);
    if (prepare) {
        text = prepare(text.toString('utf8'));
    }
    return createFile(filename, text);
}

function createParents(ns, d) {
    ns.forEach(function (dir) {
        d += dir + '/';
        createDir(d);
    });
}

function formatType (name) {
    name = (name || 'string').toLowerCase();
    switch (name) {
    case 'string':   return 'String';

    case 'date':     return 'Date';

    case 'bool':
    case 'boolean':  return 'Boolean';

    case 'int':
    case 'real':
    case 'float':
    case 'decimal':
    case 'number':   return 'Number';
    }
    return '"' + name + '"';
}

function replaceAppname (template) {
    return template.replace(/APPNAME/g, options.appname || 'default');
}

function ormDriver () {
    if (!ormDriver.config) {
        ormDriver.config = JSON.parse(require('fs').readFileSync(process.cwd() + '/config/database.json', 'utf8')).development;
    }
    return ormDriver.config.driver;
}

module.exports = {
    init: function (args) {
        parseOptions('appname');
        [ 'app/',
          'app/models/',
          'app/controllers/',
          'app/observers/',
          'app/helpers/',
          'app/views/',
          'app/views/layouts/',
          'db/',
          'log/',
          'public/',
          'public/stylesheets/',
          'public/javascripts/',
          'node_modules/',
          'node_modules/',
          'config/',
          'config/locales/',
          'config/initializers/',
          'config/environments/'
        ].forEach(createDir);
        createFile('config/routes.js', 'exports.routes = function (map) {\n};');
        createFileByTemplate('config/requirements.json', 'requirements.json');
        var srv = createFileByTemplate('server', 'server');
        createFileByTemplate('config/environment', 'mongo/config/environment');
        createFileByTemplate('config/environments/test', 'mongo/config/environments/test');
        createFileByTemplate('config/environments/development', 'mongo/config/environments/development');
        createFileByTemplate('config/environments/production', 'mongo/config/environments/production');
        createFileByTemplate('config/database.json', 'database.json', replaceAppname);
        createFileByTemplate('Jakefile', 'tasks.js');
        createFileByTemplate('db/schema.js', 'schema.js');
        createFileByTemplate('app/views/layouts/application_layout.ejs', 'layout.ejs');
        createFileByTemplate('public/index.html', 'index.html');
        createFileByTemplate('public/stylesheets/reset.css', 'reset.css');
        createFileByTemplate('public/javascripts/rails.js', 'rails.js');
        createFileByTemplate('node_modules/ejs-ext.js', 'ejs-ext.js');
        createFileByTemplate('npmfile', 'npmfile');

        fs.chmodSync(srv, 0755);
    },
    model: function (args) {
        var model = args.shift(), code = '';
        if (!model) { 
            sys.puts($('Model name required').red.bold);
            return;
        }
        var Model = model[0].toUpperCase() + model.slice(1);
        var attrs = [], result = [], driver = ormDriver();
        args.forEach(function (arg) {
            if (arg.slice(0,2) == '--') {
                options[arg.slice(2)] = true;
                return;
            }
            var property = arg.split(':')[0],
                plainType = arg.split(':')[1],
                type = formatType(plainType);

            if (driver == 'mongoose') {
                attrs.push(property + ': { type: ' + type + ' }');
            } else {
                attrs.push('    property("' + property + '", ' + type + ');');
            }
            result.push({name: property, type: type, plainType: plainType});
        });
        createDir('app/');
        createDir('app/models/');
        if (driver == 'mongoose') {
            var schema = '\n\n/**\n * ' + Model + '\n */\nvar ' + Model + 'Schema = new Schema;\n';
            schema += Model + 'Schema.add({\n    ' + attrs.join(',\n    ') + '\n});\n';
            schema += 'mongoose.model("' + Model + '", ' + Model + 'Schema);\n';
            schema += 'module.exports["' + Model + '"] = mongoose.model("' + Model + '");';
            appendToFile('db/schema.js', schema);

            code = '';
        } else {
            code = 'var ' + Model + ' = describe("' + Model + '", function () {\n' +
                attrs.join('\n') + '\n});';
        }
        createFile('app/models/' + model + '.js', code);
        return result;
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
            actions.push('action("' + action + '", function () {\n});');
        });

        createDir('app/');
        createDir('app/controllers/');
        createParents(ns, 'app/controllers/');

        // controller
        var filename = 'app/controllers/' + controller + '_controller.js';
        createFile(filename, actions.join('\n\n'));

        createDir('app/helpers/');
        createParents(ns, 'app/helpers/');

        // helper
        filename = 'app/helpers/' + controller + '_helper.js';
        createFile(filename, 'module.exports = {\n};');

        // views
        createDir('app/views/');
        createParents(ns, 'app/views/');
        createDir('app/views/' + controller + '/');
        args.forEach(function (action) {
            createFile('app/views/' + controller + '/' + action + '.ejs', '');
        });
    },
    features: function () {
        createDir('features/');
        createDir('features/step_definitions/');
        createFileByTemplate('features/step_definitions/web_steps.js', 'features/step_definitions/web_steps.js');
        createFileByTemplate('features/step_definitions/email_steps.js', 'features/step_definitions/email_steps.js');
        createFileByTemplate('features/step_definitions/jquery.js', 'features/step_definitions/jquery.js');
        try {
            require('cucumis');
        } catch (e) {
            sys.puts($('Cucumis is not installed').red + ' please run ' + $('npm install cucumis').yellow);
        }
        Object.keys(global.models || []).forEach(function (name) {
            cname = name;
            var classDefinition = models[name];
            classDefinition.implementation();
            orm.mixPersistMethods(ctx[cname], {
                className:    classDefinition.className,
                tableName:    classDefinition.tableName,
                primaryKey:   classDefinition.primaryKey,
                properties:   classDefinition.properties,
                associations: classDefinition.associations,
                scopes:       classDefinition.scopes
            });
        });

    },
    crud: function (args) {
        var model = args[0],
            models = pluralize(model).toLowerCase();

        if (!model) {
            console.log('Usage example: railway g crud post title:string content:string published:boolean');
            console.log('               railway g crud post title:string content:string published:boolean --coffee');
            return;
        }
        var ns = models.split('/');
        ns.pop();

        var result = this.model.apply(this, Array.prototype.slice.call(arguments));
        var extenstion = options.coffee ? '.coffee' : '.js';

        createDir('app/');
        createDir('app/controllers/');
        createParents(ns, 'app/controllers/');
        createFile('app/controllers/' + models + '_controller' + extenstion, controllerCode(model));

        function controllerCode (model) {
            var code, _model = model.toLowerCase();
            try {
                code = fs.readFileSync(__dirname + '/../templates/crud_controller_' + ormDriver() + extenstion);
            } catch (e) {
                code = fs.readFileSync(__dirname + '/../templates/crud_controller_redis' + extenstion);
            }
            code = code
                .toString('utf8')
                .replace(/models/g, pluralize(model).toLowerCase())
                .replace(/model/g, model.toLowerCase())
                .replace(/Model/g, camelize(model, true))
                .replace(/FILTER_PROPERTIES/g, '[' + result.map(function (p) {
                    return "'" + p.name + "'";
                }).join(', ') + ']');
            return code;
        }

        createDir('app/helpers/');
        createParents(ns, 'app/helpers/');

        // helper
        filename = 'app/helpers/' + models + '_helper.js';
        createFile(filename, 'module.exports = {\n};');

        // layout
        createFileByTemplate('app/views/layouts/' + models + '_layout.ejs', 'views/scaffold_layout.ejs', replaceModel);
        // style
        createFileByTemplate('public/stylesheets/scaffold.css', 'scaffold.css');

        // views
        // _form partial
        var form = '';
        result.forEach(function (property) {
            form += [
                '<p>',
                '  <%- form.label("' + property.name + '") %><br />',
                '  <%- form.input("' + property.name + '") %>',
                '</p>'
            ].join('\n') + '\n';
        });
        createDir('app/views/');
        createDir('app/views/' + models + '/');
        createFile('app/views/' + models + '/_form.ejs', form);
        // new
        createFileByTemplate('app/views/' + models + '/new.ejs', 'views/new.ejs', replaceModel);
        // edit
        createFileByTemplate('app/views/' + models + '/edit.ejs', 'views/edit.ejs', replaceModel);
        // index
        createFileByTemplate('app/views/' + models + '/index.ejs', 'views/index.ejs', replaceModel);
        // show
        createFileByTemplate('app/views/' + models + '/show.ejs', 'views/show.ejs', replaceModel);

        function replaceModel (code) {
            return code
                .replace(/models/g, models)
                .replace(/model/g, model.toLowerCase());
        }

        // route
        var routesConfig = process.cwd() + '/config/routes.js',
            routes = fs.readFileSync(routesConfig, 'utf8')
                .toString()
                .replace(/\s+$/g, '')
                .split('\n'),
            lastLine = routes.pop();

        if (lastLine.match(/^\s*\};\s*$/) && !routes.some(containRoute)) {
            routes.push('    map.resources(\'' + models + '\');');
            routes.push(lastLine);
            fs.writeFileSync(routesConfig, routes.join('\n'));
            sys.puts($('patch').bold.blue + '  ' + routesConfig);
        }

        function containRoute (line) {
            var m = line.match(/^\s*map\.resources\('([^']+)'/);
            return m && m[1] == models;
        }
    }
};

exports.scaffold = exports.crud;

