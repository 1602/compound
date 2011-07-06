/**
 * Module dependencies
 */
var path      = require('path');
var fs        = require('fs');
var sys = require('sys');

/**
 * Shortcut required railway utils
 */
var pluralize = railway.utils.pluralize;
var camelize  = railway.utils.camelize;
var $         = railway.utils.stylize.$;
var exec      = require('child_process').exec

/**
 * Command line options
 * populated by parseOptions method
 *
 * @api private
 */
var options   = {};

/**
 * Generators collection hash
 *
 * @type Hash
 * @api private
 */
var collection = {};

/**
 * Add generator to collection
 *
 * @param name
 * @param callback
 * @param meta Object {description: String, examples: [String]}
 * @api public
 */
function addGenerator(name, callback, meta) {
    meta = meta || {};
    callback.meta = meta;
    collection[name] = callback;

    if (meta.alias) {
        collection[meta.alias] = callback;
    }
};
exports.addGenerator = addGenerator;

/**
 * Check whether generator exists
 * @param name - name of generator
 * @api public
 */
function exists(name) {
    return !!collection[name];
}
exports.exists = exists;

/**
 * Call generator method
 */
function perform(name, args) {
    collection[name](args);
}
exports.perform = perform;

exports.list = function () {
    return Object.keys(collection).join(' ');
};

/**
 * Add built-in generators
 */
(function () {

    addGenerator('init', initGenerator);
    addGenerator('model', modelGenerator);
    addGenerator('controller', controllerGenerator);
    addGenerator('features', featuresGenerator);
    addGenerator('crud', crudGenerator, {alias: 'scaffold'});

    function initGenerator(args) {

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
          'config/',
          'config/locales/',
          'config/initializers/',
          'config/environments/'
        ].forEach(createDir);

        var db = options.db;

        createFile('config/routes.js', 'exports.routes = function (map) {\n};');
        createFileByTemplate('config/requirements.json', 'requirements.json');
        var srv = createFileByTemplate('server', 'server');
        var secret = require('crypto').createHash('sha1').update(Math.random().toString()).digest('hex');
        if (options.coffee) {
            createFile('app/controllers/application_controller.coffee', 'before ->\n    protectFromForgery \'' + secret + '\'\n\n');
        } else {
            createFile('app/controllers/application_controller.js', 'before(function () {\n    protectFromForgery(\'' + secret + '\');\n});\n');
        }
        createFileByTemplate('config/environment',              'config/environment', replaceViewEngine);
        createFileByTemplate('config/environments/test',        'config/environments/test');
        createFileByTemplate('config/environments/development', 'config/environments/development');
        createFileByTemplate('config/environments/production',  'config/environments/production');
        createFileByTemplate('config/database.json',            'config/database_' + db + '.json', replaceAppname);
        createFileByTemplate('db/schema.js', 'schema.js');
        createViewByTemplate('app/views/layouts/application_layout', 'application_layout');
        createFileByTemplate('public/index.html', 'index.html');
        createFileByTemplate('public/stylesheets/reset.css', 'reset.css');
        createFileByTemplate('public/javascripts/rails.js', 'rails.js');
        createFile('public/javascripts/application.js', '// place your application-wide javascripts here\n');
        createFileByTemplate('npmfile', 'npmfile', replaceViewEngine);
        createFileByTemplate('public/favicon.ico', 'favicon.ico');
        var extenstion = options.coffee ? '.coffee' : '.js';
        var engine = options.coffee ? 'coffee' : 'node';
        createFile('Procfile', 'web: ' + engine + ' server' + extenstion);

        createFileByTemplate('package.json', 'package.json', [replaceAppname, replaceViewEngine]);

        // copy some dependencies to node_modules
        var wait = 0;
        ['ejs-ext', 'jade-ext', 'ejs', 'jade', '..'].forEach(function (module) {
            wait += 1;
            var source = path.resolve(__dirname, '../distr/' + module);
            var target = path.join(process.cwd(), options.appname, '/node_modules');
            if (!~target.search(source)) {
                exec('cp -R ' + source + ' ' + target, done);
            } else {
                exec('ln -s ' + source + ' ' + target, done);
            }
        });

        function done() {
            if (--wait === 0) process.exit();
        }

        fs.chmodSync(srv, 0755);
    }

    function modelGenerator(args) {

        parseOptions('model');
        var model = options.model, code = '';
        if (!model) { 
            sys.puts($('Model name required').red.bold);
            return;
        }
        var Model = model[0].toUpperCase() + model.slice(1);
        var attrs = [], result = [], driver = ormDriver();
        options.forEach(function (arg) {
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
            // TODO: find proper way to determine model name
            schema += 'module.exports["' + Model + '"].modelName = "' + Model + '"';
            appendToFile('db/schema.js', schema);

            code = '';
        } else {
            code = 'var ' + Model + ' = describe("' + Model + '", function () {\n' +
            attrs.join('\n') + '\n});';
        }
        createFile('app/models/' + model + '.js', code);
        return result;
    }

    function controllerGenerator(args) {
        parseOptions('controller');
        var controller = options.controller;

        if (!controller) {
            console.log('Usage example: railway g controller controllername actionName anotherActionName');
            console.log('               railway g controller controllername actionName anotherActionName --coffee');
            return;
        }

        if (options.coffee) {
            var extenstion = '.coffee';
            var actions = ['load \'application\''];
            options.forEach(function (action) {
                actions.push('action "' + action + '", () -> \n    render\n        title: "' + controller + '#' + action + '"');
            });
        } else {
            var extenstion = '.js';
            var actions = ['load(\'application\');'];
            options.forEach(function (action) {
                actions.push('action("' + action + '", function () {\n    render({\n        title: "' + controller + '#' + action + '"\n    });\n});');
            });
        }

        var ns = controller.split('/');
        ns.pop();

        createDir('app/');
        createDir('app/controllers/');
        createParents(ns, 'app/controllers/');

        // controller
        var filename = 'app/controllers/' + controller + '_controller'  + extenstion;
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

        options.forEach(function (action) {
            createView('app/views/' + controller + '/' + action, 'default_action_view', [controller, action]);
        });
    }

    function featuresGenerator() {
        createDir('features/');
        createDir('features/step_definitions/');
        createFileByTemplate('features/step_definitions/web_steps.js',   'features/step_definitions/web_steps.js');
        createFileByTemplate('features/step_definitions/email_steps.js', 'features/step_definitions/email_steps.js');
        createFileByTemplate('features/step_definitions/jquery.js',      'features/step_definitions/jquery.js');

        try {
            require('cucumis');
        } catch (e) {
            sys.puts($('Cucumis is not installed').red + ' please run ' + $('npm install cucumis').yellow);
        }

        // Object.keys(global.models || []).forEach(function (name) {
        //     cname = name;
        //     var classDefinition = models[name];
        //     classDefinition.implementation();
        //     orm.mixPersistMethods(ctx[cname], {
        //         className:    classDefinition.className,
        //         tableName:    classDefinition.tableName,
        //         primaryKey:   classDefinition.primaryKey,
        //         properties:   classDefinition.properties,
        //         associations: classDefinition.associations,
        //         scopes:       classDefinition.scopes
        //     });
        // });
    }

    function crudGenerator(args) {
        var model = args[0],
            models = pluralize(model).toLowerCase();

        if (!model) {
            console.log('Usage example: railway g crud post title:string content:string published:boolean');
            console.log('               railway g crud post title:string content:string published:boolean --coffee');
            return;
        }
        var ns = models.split('/');
        ns.pop();

        var result = modelGenerator.apply(this, Array.prototype.slice.call(arguments));
        var extenstion = options.coffee ? '.coffee' : '.js';

        createDir('app/');
        createDir('app/controllers/');
        createParents(ns, 'app/controllers/');
        createFile('app/controllers/' + models + '_controller' + extenstion, controllerCode(model));

        function controllerCode(model) {
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
        createViewByTemplate('app/views/layouts/' + models + '_layout', 'scaffold_layout', replaceModel);

        // style
        createFileByTemplate('public/stylesheets/scaffold.css', 'scaffold.css');

        // tests
        createDir('test/');
        createFileByTemplate('test/test_helper.js', 'test_helper.js');
        createDir('test/controllers');
        createParents(ns, 'test/controllers/');
        if (ormDriver() === 'mongoose') {
            createFileByTemplate('test/controllers/' + models + '_controller_test', 'crud_controller_test_mongoose', replaceModel);
        } else {
            createFileByTemplate('test/controllers/' + models + '_controller_test.js', 'crud_controller_test_redis.js', replaceModel);
        }

        // views
        // _form partial
        createDir('app/views/');
        createDir('app/views/' + models + '/');
        createView('app/views/' + models + '/_form', 'scaffold_form', result);
        ['new', 'edit', 'index', 'show'].forEach(function (template) {
            createViewByTemplate('app/views/' + models + '/' + template, 'scaffold_' + template, replaceModel);
        });

        function replaceModel(code) {
            return code
                .replace(/models/g, models)
                .replace(/model/g, model.toLowerCase())
                .replace(/Model/g, camelize(model, true))
                .replace(/VALID_ATTRIBUTES/, result.map(function (attr) { return attr.name + ": ''" }).join(',\n        '));
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

        function containRoute(line) {
            var m = line.match(/^\s*map\.resources\('([^']+)'/);
            return m && m[1] == models;
        }
    }

    /**
     * Private helper methods
     */

    function parseOptions(defaultKeyName) {
        options = [];
        options.tpl = app.settings['view engine'] || 'ejs';
        options.coffee = app.enabled('coffee');
        options.db = 'mongoose';
        var key = defaultKeyName || false;
        args.forEach(function (arg) {
            if (arg.slice(0, 2) == '--') {
                key = arg.slice(2);
                options[key] = true;
            } else if (arg[0] == '-') {
                key = arg.slice(1);
                options[key] = true;
            } else if (key) {
                options[key] = arg;
                key = false;
            } else {
                options.push(arg);
            }
        });
        if (options.nocoffee) {
            options.coffee = false;
        }
    }

    function createDir(dir) {
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

    function appendToFile(filename, contents) {
        var root = process.cwd() + '/',
            fd = fs.openSync(root + filename, 'a');
        fs.writeSync(fd, contents);
        fs.closeSync(fd);
    }

    function createFile(filename, contents) {
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

    function createFileByTemplate(filename, template, prepare) {
        if (!template.match(/\..+$/)) {
            var ext = options.coffee ? '.coffee' : '.js';
            template += ext;
            filename += ext;
        }
        var text = fs.readFileSync(__dirname + '/../templates/' + template);
        if (prepare) {
            text = text.toString('utf8');
            if (typeof prepare === 'function') {
                prepare = [prepare];
            }
            prepare.forEach(function (p) {
                text = p(text);
            });
        }
        return createFile(filename, text);
    }

    function createViewByTemplate(filename, template, prepare) {
        options.tpl = options.tpl || 'ejs';
        var package = options.tpl + '-ext';
        try {
            var tpl = require(package);
        } catch (e) {
            sys.puts($('Templating engine ' + options.tpl + ' is not supported').red);
            return;
        }
        var text = fs.readFileSync(tpl.template(template));
        if (prepare) {
            text = prepare(text.toString('utf8'));
        }
        return createFile(filename + tpl.extension, text);
    }

    function createView(filename, template, data) {
        options.tpl = options.tpl || 'ejs';
        var package = options.tpl + '-ext';
        try {
            var tpl = require(package);
        } catch (e) {
            sys.puts($('Templating engine ' + options.tpl + ' is not supported').red);
            return;
        }
        var text = tpl.templateText(template, data);
        return createFile(filename + tpl.extension, text);
    }

    function createParents(ns, d) {
        ns.forEach(function (dir) {
            d += dir + '/';
            createDir(d);
        });
    }

    function formatType(name) {
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

    function replaceAppname(template) {
        return template.replace(/APPNAME/g, options.appname || 'default');
    }

    function replaceViewEngine(template) {
        return template.replace(/VIEWENGINE/g, options.tpl || 'ejs');
    }

    function ormDriver() {
        if (!ormDriver.config) {
            ormDriver.config = JSON.parse(require('fs').readFileSync(process.cwd() + '/config/database.json', 'utf8')).development;
        }
        return ormDriver.config.driver;
    }

})();
