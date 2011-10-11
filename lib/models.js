var fs          = require('fs'),
    path = require('path'),
    Schema      = require('jugglingdb').Schema,
    // import railway utils
    utils       = require('./railway_utils'),
    camelize    = utils.camelize,
    classify    = utils.classify,
    underscore  = utils.underscore,
    singularize = utils.singularize,
    pluralize   = utils.pluralize,
    runCode     = utils.runCode;

function prepareContext(to_export, schema) {
    var ctx = {app: app},
        models = {}, cname;

    ctx.describe = ctx.define = function (className, callback) {
        cname = className;
        models[cname] = {};
        callback();
        ctx[cname] = to_export[cname] = schema.define(className, models[cname]);
    };

    ctx.property = function (name, type, params) {
        if (!params) params = {};
        params.type = type;
        models[cname][name] = params;
    };

    return ctx;
}

/**
 * Initialize models
 */
exports.init = function () {
    var result = {}, ormDriver, context,
        config, env = process.env.NODE_ENV || 'development',
        app_root = app.root;

    if (!require('path').existsSync(app.root + '/config')) {
        return;
    }

    try {
        config = JSON.parse(fs.readFileSync(app_root + '/config/database.json', 'utf-8'))[env];
    } catch (e) {
        console.log('WARNING: Could not find database config in `config/database.json` for NODE_ENV = ' + env);
        return;
    }

    var schema = new Schema(config && config.driver || 'memory', config);

    context = prepareContext(result, schema);

    // code coverage support
    if (process.cov) context.__cov = __cov;

    // run schema first
    var schemaFile = app.root + '/db/schema.';
    if (path.existsSync(schemaFile + 'js')) {
        schemaFile += 'js';
    } else {
        schemaFile += 'coffee';
    }
    runCode(schemaFile, context);

    // then run models
    fs.readdirSync(app_root + '/app/models/').forEach(function (file) {
        if (file.match(/^[^\.].*?\.(js|coffee)$/)) {
            var filename = app_root + '/app/models/' + file;
                runCode(filename, context);
        }
    });

    // and freeze schema
    schema.freeze();

    // globalize models
    Object.keys(result).forEach(function (cls) {
        global[cls] = result[cls];
    });
    global.models = result;
    app.models = result;
    return result;
};
