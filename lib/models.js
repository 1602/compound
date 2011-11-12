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
    $           = utils.stylize.$,
    _schemas    = [];

function log(str, startTime) {
    var m = Date.now() - startTime;
    utils.debug(str + $(' [' + (m < 10 ? m : $(m).red) + ' ms]').bold);
}

function prepareContext(exportModels, defSchema, done) {
    var ctx = {app: app},
        models = {}, cname, schema, wait = connected = 0;

    done = done || function () {};

    /**
     * Multiple schemas support
     * example:
     * schema('redis', {url:'...'}, function () {
     *     describe models using redis connection
     *     ...
     * });
     * schema(function () {
     *     describe models stored in memory
     *     ...
     * });
     */
    ctx.schema = function () {
        var name = argument('string');
        var opts = argument('object') || {};
        var def = argument('function') || function () {};
        schema = new Schema(name || opts.driver || 'memory', opts);
        _schemas.push(schema);
        wait += 1;
        ctx.gotSchema = true;
        schema.log = log;
        schema.on('connected', function () {
            if (wait === ++connected) done();
        });
        def();
        schema = false;
    };

    /**
     * Define a class in current schema
     */
    ctx.describe = ctx.define = function (className, callback) {
        cname = className;
        models[cname] = {};
        callback && callback();
        return ctx[cname] = exportModels[cname] = (schema || defSchema).define(className, models[cname]);
    };

    /**
     * Define a property in current class
     */
    ctx.property = function (name, type, params) {
        if (!params) params = {};
        if (typeof type !== 'function' && typeof type === 'object') {
            params = type;
            type = String;
        }
        params.type = type || String;
        models[cname][name] = params;
    };

    return ctx;

    function argument(type) {
        var r;
        [].forEach.call(arguments.callee.caller.arguments, function (a) {
            if (!r && typeof a === type) r = a;
        });
        return r;
    }
}

/**
 * Initialize models
 */
exports.init = function (callback) {
    var result = {}, ormDriver, context,
        config, env = process.env.NODE_ENV || 'development',
        app_root = app.root, wait = 0;

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
    schema.log = log;
    _schemas.push(schema);
    wait += 1;
    schema.on('connected', done);

    wait += 1;
    context = prepareContext(result, schema, done);

    function done() {
        if (--wait === 0 && callback) callback();
    }

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

    if (!context.gotSchema) done();

    // then run models
    fs.readdirSync(app_root + '/app/models/').forEach(function (file) {
        if (file.match(/^[^\.].*?\.(js|coffee)$/)) {
            var filename = app_root + '/app/models/' + file;
                runCode(filename, context);
        }
    });

    // and freeze schemas
    _schemas.forEach(function (schema) {
        schema.freeze();
    });

    // globalize models
    Object.keys(result).forEach(function (cls) {
        global[cls] = result[cls];
    });
    global.models = result;
    app.models = result;
    return result;
};

app.disconnectSchemas = function disconnectSchemas() {
    if (_schemas.length) {
        _schemas.forEach(function (schema) {
            schema.disconnect();
        });
        _schemas = [];
    }
}

