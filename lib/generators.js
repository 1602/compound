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

    /**
     * Application initialization generator. Can be called with leading
     * appname param, or without it (init in current dir).
     *
     * When destination
     * is not empty old files wouldn't be overwritten by this generator, it's safe
     * to call generator again and again to restore some non-existing files
     * initial state
     *
     * @api public
     */
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
          'db/seeds/',
          'db/seeds/development/',
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

        createFileByTemplate('config/initializers/db-tools', 'db-tools');
        createFileByTemplate('config/routes', 'config/routes');
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
        createFileByTemplate('config/database.~',               'config/database_' + db + '.~', replaceAppname);
        createFileByTemplate('db/schema', 'schema');
        createViewByTemplate('app/views/layouts/application_layout', 'application_layout');
        createFileByTemplate('public/index.html', 'index.html');
        createFile('.gitignore', fs.readFileSync(path.join(__dirname, '/../templates/gitignore')));
        
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

    /**
     * Generates model. Accepts list of params: first one is model name, then
     * fieldnames as name:type, by default type is string.
     *
     * This generator accepts --coffee modifier to generate code in coffee
     *
     * Example:
     *
     *     railway generate User email birthdate:Date isAdmin:Boolean
     *
     * Affected files:
     *
     * - db/schema.js
     * - app/models/ModelName.js
     *
     * @api public
     */
    function modelGenerator(args) {

        parseOptions('model');
        var model = options.model, code = '';
        if (!model) { 
            sys.puts($('Model name required').red.bold);
            return;
        }
        if (model.match(/\//)) {
            model = model.match(/\/([^\/]+)$/)[1];
        }
        if (model.match(/\./)) {
            model = model.match(/\.([^\.]+)$/)[1];
        }
        var fileExtension = options.coffee ? '.coffee' : '.js';
        var Model = model[0].toUpperCase() + model.slice(1);
        var attrs = [], result = [];
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
        createDir('db/');
        createFile('db/schema' + fileExtension, '');
        railway.utils.appendToFile('db/schema' + fileExtension, code);
        return result;
    }

    /**
     * Generates single controller and related views. Accepts arguments:
     *
     *  - controller name
     *  - action names
     *  - `--coffee` modifier can be passed to generate code in coffee
     *
     * Affected files:
     *
     *  - app/controllers/controller_name_controller.js
     *  - app/views/controller_name/action1.ejs
     *  - app/views/controller_name/action2.ejs
     *
     * @api public
     */
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

    /**
     * Cucumis features generator
     * @deprecated
     * @api public
     */
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

    }

    /**
     * Resource scaffolding generator. Accepts same arguments as model generator:
     * name of model (singilar) and list of model properties in
     * `property:type` format
     *
     * It creates ready-to-use model, controller, controller tests (nodeunit),
     * routing rule, views and layout
     *
     * @api public
     */
    function crudGenerator(args) {
        var model = args[0].split('.').pop();
        var parents = args[0].split('.').slice(0, -1);
        var models = pluralize(model).toLowerCase();

        if (!model) {
            console.log('Usage example: railway g crud post title:string content:string published:boolean');
            console.log('               railway g crud post title:string content:string published:boolean --coffee');
            return;
        }
        var ns = models.split('/');
        ns.pop();

        createDir('app/');
        createDir('app/controllers/');
        createParents(ns, 'app/controllers/');

        var result = modelGenerator.apply(this, Array.prototype.slice.call(arguments));

        var fileExtension = options.coffee ? '.coffee' : '.js';
        createFile('app/controllers/' + models + '_controller' + fileExtension, controllerCode(args[0], result));

        createDir('app/helpers/');
        createParents(ns, 'app/helpers/');

        function replaceModel(code) {
            return code
                .replace(/new_model/g, addParents('new_', parents, model))
                .replace(/edit_model/g, addParents('edit_', parents, model, true))
                .replace(/path_to\.models/g, addParents('path_to.', parents, models))
                .replace(/path_to\.model/g, addParents('path_to.', parents, model, true))
                .replace(/(path_to\..*?\()model/g, addParents('$1', parents.map(function (p) { return 'params.' + p + '_id';}), model, true, ', '))
                .replace(/models/g, models)
                .replace(/model/g, model.toLowerCase())
                .replace(/Model/g, camelize(model, true))
                .replace(/VALID_ATTRIBUTES/, result.map(function (attr) { return attr.name + ": ''" }).join(',\n        '));
        }

        // helper
        createFile('app/helpers/' + models + '_helper.js', 'module.exports = {\n};');
        // tests
        createDir('test/');
        createFileByTemplate('test/test_helper.js', 'test_helper.js');
        createDir('test/controllers');
        createParents(ns, 'test/controllers/');

        createFileByTemplate('test/controllers/' + models + '_controller_test.js', 'crud_controller_test.js', replaceModel);

        // views
        // _form partial
        createDir('app/views/');
        createParents(ns, 'app/views/');
        createParents(ns, 'app/views/layouts/');
        // layout
        createViewByTemplate('app/views/layouts/' + models + '_layout', 'scaffold_layout', replaceModel);

        createDir('app/views/' + models + '/');
        createView('app/views/' + models + '/_form', 'scaffold_form', result, replaceModel);
        createView('app/views/' + models + '/show', 'scaffold_show', result, replaceModel);
        ['new', 'edit', 'index'].forEach(function (template) {
            createViewByTemplate('app/views/' + models + '/' + template, 'scaffold_' + template, replaceModel);
        });

        // route
        var routesConfig = process.cwd() + '/config/routes.' + (options.coffee ? 'coffee' : 'js'),
            routes = fs.readFileSync(routesConfig, 'utf8')
                .toString()
                .replace(/\s+$/g, '')
                .split('\n'),
            firstLine         = routes.shift(),
            firstLineRegexp   = options.coffee ? /^exports\.routes = \(map\)\->/ : /^exports\.routes = function \(map\) \{/,
            mapRouteResources = options.coffee ? '  map.resources \'' + models + '\'' : '    map.resources(\'' + models + '\');'

        if (firstLine.match() && !routes.some(containRoute)) {
            routes.unshift(mapRouteResources);
            routes.unshift(firstLine);
            fs.writeFileSync(routesConfig, routes.join('\n'));
            sys.puts($('patch').bold.blue + '  ' + routesConfig);
        }

        function containRoute(line) {
            var m = line.match(/^\s*map\.resources(\(|\s)'([^']+)'/);
            return m && m[1] == models;
        }
    }

    /**
     * Get controller code
     * @private
     */
    function controllerCode(model, result) {
        var fileExtension = options.coffee ? '.coffee' : '.js';
        var code;
        var parents = model.split('.').slice(0, -1);
        model = model.split('.').pop();
        var models = pluralize(model).toLowerCase();

        code = fs.readFileSync(__dirname + '/../templates/crud_controller' + fileExtension);
        code = code
            .toString('utf8')
            .replace(/new_model/g, addParents('new_', parents, model))
            .replace(/edit_model/g, addParents('edit_', parents, model, true))
            .replace(/path_to\.models/g, addParents('path_to.', parents, models))
            .replace(/path_to\.model/g, addParents('path_to.', parents, model, true))
            .replace(/(path_to\..*?\()this\.model/g, addParents('$1', parents.map(function (p) { return 'params.' + p + '_id';}), 'this.' + model, true, ', '))
            .replace(/models/g, models)
            .replace(/model/g, model.toLowerCase())
            .replace(/Model/g, camelize(model, true))
            .replace(/FILTER_PROPERTIES/g, '[' + result.map(function (p) {
                return "'" + p.name + "'";
            }).join(', ') + ']');
        return code;

    }

    function addParents(prefix, parents, base, skipParams, join) {
        var name;
        if (!join) join = '_';
        if (parents.length) {
            name = prefix + parents.join(join) + join + base;
        } else {
            name = prefix + base;
        }
        if (skipParams) return name;
        return name + '(' + parents.map(function (p) {
            return 'params.' + p + '_id';
        }).join(', ') + ')';
    }


    /**
     * Parse command line options
     * @private
     */
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

    /**
     * Create directory
     * @private
     */
    function createDir(dir) {
        var root = process.cwd();
        if (options.appname && !createDir.rootCreated) {
            createDir.rootCreated = true;
            createDir('');
        }
        if (options.appname) {
            dir = path.join(options.appname, dir);
        }
        if (railway.utils.existsSync(path.join(root, dir))) {
            sys.puts($('exists').bold.grey + '  ' + dir);
        } else {
            fs.mkdirSync(path.join(root, dir), 0755);
            sys.puts($('create').bold.green + '  ' + dir);
        }
    }

    /**
     * Append `contents` to a file
     *
     * @param {String} filename
     * @param {String} contents
     * @private
     */
    function appendToFile(filename, contents) {
        var root = process.cwd(),
            fd = fs.openSync(path.join(root, filename), 'a');
        fs.writeSync(fd, contents);
        fs.closeSync(fd);
    }
    railway.utils.appendToFile = appendToFile;

    /**
     * Create file with given `contents`
     *
     * @param {String} filename
     * @param {String} contents
     * @private
     */
    function createFile(filename, contents) {
        var root = process.cwd();
        if (options.appname) {
            filename = path.join(options.appname, filename);
        }
        var fullPath = root + '/' + filename;
        if (railway.utils.existsSync(fullPath)) {
            sys.puts($('exists').bold.grey + '  ' + filename);
        } else {
            fs.writeFileSync(fullPath, contents);
            sys.puts($('create').bold.green + '  ' + filename);
        }
        return fullPath;
    }

    /**
     * Create file with name `filename` using contents of `template` file.
     * Run `prepare` function before returning result
     *
     * @param {String} filename
     * @param {String} template
     * @param {Function} prepare - called with (text: {String}),
     * should return {String}
     *
     * @private
     */
    function createFileByTemplate(filename, template, prepare) {
        var configFilenameRegexp = /\.~$/;
        if (template.match(configFilenameRegexp)) {
            var fileExtension = options.coffee ? '.yml' : '.json';
            template = template.replace(configFilenameRegexp, fileExtension);
            filename = filename.replace(configFilenameRegexp, fileExtension);
        }
        else if (!template.match(/\..+$/)) {
            var fileExtension = options.coffee ? '.coffee' : '.js';
            template += fileExtension;
            filename += fileExtension;
        }
        var text = fs.readFileSync(path.join(__dirname, '/../templates/', template));
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

    /**
     * Create view file with name `filename` using contents of `template` file.
     * Run `prepare` function before returning result. It look for -tpl option
     * and result file with proper extension and contents
     *
     * @param {String} filename
     * @param {String} template
     * @param {Function} prepare - called with (text: {String}),
     * should return {String}
     *
     * @private
     */
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
            d = path.join(d, dir);
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

    function loadConfig(filename) {
        var filenameExt = /\.([^\.]+)$/.exec(filename)[1];
        switch (filenameExt) {
          case '~':
            var config = null;
            ['.json','.yml'].forEach(function(testExt){
              try {
                var testFilename = filename.replace(/\.~$/, testExt)
                var stats = fs.lstatSync(testFilename);
                if (stats.isFile())
                  config = loadConfig(testFilename);
              }
              catch(e) {}
            });
            if (config != null) return config;
            throw new Error( sys.format('Can not find configuration file by path template "%s"', filename) );
            break;
          case 'json':
            return JSON.parse(fs.readFileSync(filename, 'utf8'));
          case 'yml':
            return require(filename).shift();
          default:
            throw new Error( sys.format('Unknown configuration file name extension "%s"', filenameExt) );
        }
    };

})();
