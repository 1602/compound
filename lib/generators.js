/**
 * Module dependencies
 */
var path      = require('path');
var fs        = require('fs');
var sys = require('util');

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
}
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
          'public/images',
          'public/stylesheets/',
          'public/javascripts/',
          'node_modules/',
          'config/',
          'config/locales/',
          'config/initializers/',
          'config/environments/'
        ].forEach(createDir);

        if (options.stylus) {
            createDir('app/assets/');
            createDir('app/assets/styles/');
            createFileByTemplate('app/assets/styles/example.styl', 'example.styl');
        }

        var db = options.db;

        createFileByTemplate('config/routes.js', 'config/routes.js');
        // createFileByTemplate('config/requirements.json', 'requirements.json');
        var srv = createFileByTemplate('server', 'server');
        var secret = require('crypto').createHash('sha1').update(Math.random().toString()).digest('hex');
        if (options.coffee) {
            createFile('app/controllers/application_controller.coffee', 'before \'protect from forgery\', ->\n    protectFromForgery \'' + secret + '\'\n\n');
        } else {
            createFile('app/controllers/application_controller.js', 'before(\'protect from forgery\', function () {\n    protectFromForgery(\'' + secret + '\');\n});\n');
        }
        createFileByTemplate('config/environment',              'config/environment', [ replaceViewEngine, replacePrependMiddleware ]);
        createFileByTemplate('config/environments/test',        'config/environments/test');
        createFileByTemplate('config/environments/development', 'config/environments/development');
        createFileByTemplate('config/environments/production',  'config/environments/production');
        createFileByTemplate('config/database.json',            'config/database_' + db + '.json', replaceAppname);
        createFileByTemplate('db/schema', 'schema');
        createViewByTemplate('app/views/layouts/application_layout', 'application_layout');
        createFileByTemplate('public/index.html', 'index.html');
        
        // bootstrap files
        createFileByTemplate('public/stylesheets/bootstrap-responsive.css', 'bootstrap-responsive.css');
        createFileByTemplate('public/stylesheets/bootstrap.css', 'bootstrap.css');
        createFileByTemplate('public/images/glyphicons-halflings-white.png', 'glyphicons-halflings-white.png');
        createFileByTemplate('public/images/glyphicons-halflings.png', 'glyphicons-halflings.png');
        createFileByTemplate('public/javascripts/bootstrap.js', 'bootstrap.js');
        
        createFileByTemplate('public/stylesheets/style.css', 'style.css');
        createFileByTemplate('public/javascripts/rails.js', 'rails.js');
        createFile('public/javascripts/application.js', '// place your application-wide javascripts here\n');
        createFileByTemplate('npmfile', 'npmfile', replaceViewEngine);
        createFileByTemplate('public/favicon.ico', 'favicon.ico');
        var fileExtension = options.coffee ? '.coffee' : '.js';
        var engine = options.coffee ? 'coffee' : 'node';
        // this file is only needed for heroku deployments
        // maybe not produce it by default
        createFile('Procfile', 'web: ' + engine + ' server' + fileExtension);

        createFileByTemplate('package.json', 'package.json', [replaceAppname, replaceViewEngine]);

        fs.chmodSync(srv, 0755);

        process.exit();
    }

    function modelGenerator(args) {

        parseOptions('model');
        var model = options.model, code = '';
        if (!model) { 
            sys.puts($('Model name required').red.bold);
            return;
        }
        var fileExtension = options.coffee ? '.coffee' : '.js';
        var Model = model[0].toUpperCase() + model.slice(1);
        var attrs = [], result = [], driver = ormDriver();
        options.forEach(function (arg) {
            var property = arg.split(':')[0],
            plainType = arg.split(':')[1],
            type = formatType(plainType);

            if (options.coffee) {
                attrs.push('    property \'' + property + '\', ' + type);
            } else {
                attrs.push('    property(\'' + property + '\', ' + type + ');');
            }
            result.push({name: property, type: type, plainType: plainType});
        });
        createDir('app/');
        createDir('app/models/');
        createFile('app/models/' + model + fileExtension, '');

        if (options.coffee) {
            code = Model + ' = describe \'' + Model + '\', () ->\n' +
            attrs.join('\n') + '\n';
        } else {
            code = 'var ' + Model + ' = describe(\'' + Model + '\', function () {\n' +
            attrs.join('\n') + '\n});';
        }
        appendToFile('db/schema' + fileExtension, code);
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

        var fileExtension;
        var actions;
        if (options.coffee) {
            fileExtension = '.coffee';
            actions = ['load \'application\''];
            options.forEach(function (action) {
                actions.push('action \'' + action + '\', () -> \n    render\n        title: "' + controller + '#' + action + '"');
            });
        } else {
            fileExtension = '.js';
            actions = ['load(\'application\');'];
            options.forEach(function (action) {
                actions.push('action(\'' + action + '\', function () {\n    render({\n        title: "' + controller + '#' + action + '"\n    });\n});');
            });
        }

        var ns = controller.split('/');
        ns.pop();

        createDir('app/');
        createDir('app/controllers/');
        createParents(ns, 'app/controllers/');

        // controller
        var filename = 'app/controllers/' + controller + '_controller'  + fileExtension;
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
        var driver = ormDriver();
        var model = args[0];
        var models = pluralize(model).toLowerCase();

        if (!model) {
            console.log('Usage example: railway g crud post title:string content:string published:boolean');
            console.log('               railway g crud post title:string content:string published:boolean --coffee');
            return;
        }
        var ns = models.split('/');
        ns.pop();

        var result = modelGenerator.apply(this, Array.prototype.slice.call(arguments));

        createDir('app/');
        createDir('app/controllers/');
        createParents(ns, 'app/controllers/');
        var fileExtension = options.coffee ? '.coffee' : '.js';
        createFile('app/controllers/' + models + '_controller' + fileExtension, controllerCode(model, driver, result));

        createDir('app/helpers/');
        createParents(ns, 'app/helpers/');

        function replaceModel(code) {
            return code
                .replace(/models/g, models)
                .replace(/model/g, model.toLowerCase())
                .replace(/Model/g, camelize(model, true))
                .replace(/VALID_ATTRIBUTES/, result.map(function (attr) { return attr.name + ": ''" }).join(',\n        '));
        }

        // helper
        createFile('app/helpers/' + models + '_helper.js', 'module.exports = {\n};');

        // layout
        createViewByTemplate('app/views/layouts/' + models + '_layout', 'scaffold_layout', replaceModel);

        // tests
        createDir('test/');
        createFileByTemplate('test/test_helper.js', 'test_helper.js');
        createDir('test/controllers');
        createParents(ns, 'test/controllers/');

        createFileByTemplate('test/controllers/' + models + '_controller_test.js', 'crud_controller_test.js', replaceModel);

        // views
        // _form partial
        createDir('app/views/');
        createDir('app/views/' + models + '/');
        createView('app/views/' + models + '/_form', 'scaffold_form', result);
        createView('app/views/' + models + '/show', 'scaffold_show', result, replaceModel);
        ['new', 'edit', 'index'].forEach(function (template) {
            createViewByTemplate('app/views/' + models + '/' + template, 'scaffold_' + template, replaceModel);
        });

        // route
        var routesConfig = process.cwd() + '/config/routes.js',
            routes = fs.readFileSync(routesConfig, 'utf8')
                .toString()
                .replace(/\s+$/g, '')
                .split('\n'),
            firstLine = routes.shift();
        if (firstLine.match(/^exports\.routes = function \(map\) \{/) && !routes.some(containRoute)) {
            routes.unshift('    map.resources(\'' + models + '\');');
            routes.unshift(firstLine);
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

     function controllerCode(model, driver, result) {
        var fileExtension = options.coffee ? '.coffee' : '.js';
        var code;
        code = fs.readFileSync(__dirname + '/../templates/crud_controller' + fileExtension);
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

    function parseOptions(defaultKeyName) {
        options = [];
        options.tpl = app.settings['view engine'] || 'ejs';
        options.coffee = app.enabled('coffee');
        options.db = 'memory';
        options.stylus = false;
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
            var fileExtension = options.coffee ? '.coffee' : '.js';
            template += fileExtension;
            filename += fileExtension;
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
        var package = options.tpl + '-ext', tpl;
        try {
            tpl = require(package);
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

    function createView(filename, template, data, fn) {
        options.tpl = options.tpl || 'ejs';
        var package = options.tpl + '-ext';
        try {
            var tpl = require(package);
        } catch (e) {
            sys.puts($('Templating engine ' + options.tpl + ' is not supported').red);
            return;
        }
        var text = tpl.templateText(template, data);
        if (typeof fn === 'function') {
            text = fn(text.toString());
        }
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

    function replacePrependMiddleware(template) {
        var mw = [];
        if (options.stylus) {
            if (options.coffee) {
                mw.push("app.use require('stylus').middleware\n        force: true, src: app.root + '/app/assets', dest: app.root + '/public', compress: true".replace(/, /g, ',\n        '));
            } else {
                mw.push("app.use(require('stylus').middleware({\n        force: true, src: app.root + '/app/assets', dest: app.root + '/public', compress: true\n    }));".replace(/, /g, ',\n        '));
            }
        }
        return template.replace(/PREPEND_MIDDLEWARE/g, mw.join('\n    '));
    };

    function ormDriver() {
        if (!ormDriver.config) {
            ormDriver.config = JSON.parse(require('fs').readFileSync(process.cwd() + '/config/database.json', 'utf8')).development;
        }
        return ormDriver.config.driver;
    }

})();
