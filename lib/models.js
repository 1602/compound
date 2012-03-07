var fs          = require('fs'),
    path = require('path'),
    jugglingdb  = require('jugglingdb'),
    Schema      = jugglingdb.Schema,
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

// publish link to ORM to railway API object
railway.orm = jugglingdb;

function log(str, startTime) {
    var m = Date.now() - startTime;
    utils.debug(str + $(' [' + (m < 10 ? m : $(m).red) + ' ms]').bold);
    app.emit('app-event', {
        type: 'query',
        param: str,
        time: m
    });
}

function prepareContext(exportModels, defSchema, done) {
    var ctx = {app: app},
        models = {},
        settings = {},
        cname,
        schema,
        wait = connected = 0,
        nonJugglingSchema = false;

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
        schema.on('log', log);
        schema.on('connected', function () {
            if (wait === ++connected) done();
        });
        def();
        schema = false;
    };

    /**
     * Use custom schema driver
     */
    ctx.customSchema = function () {
        var def = argument('function') || function () {};
        nonJugglingSchema = true;
        def();
        Object.keys(ctx.exports).forEach(function (m) {
            ctx.define(m, ctx.exports[m]);
        });
        nonJugglingSchema = false;
    };
    ctx.exports = {};
    ctx.module = { exports: ctx.exports };

    /**
     * Define a class in current schema
     */
    ctx.describe = ctx.define = function (className, callback) {
        var m;
        cname = className;
        models[cname] = {};
        settings[cname] = {};
        if (nonJugglingSchema) {
            m = callback;
        } else {
            callback && callback();
            m = (schema || defSchema).define(className, models[cname], settings[cname]);
        }
        return global[cname] = app.models[cname] = ctx[cname] = exportModels[cname] = m;
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

    /**
     * Set custom table name for current class
     * @param name - name of table
     */
    ctx.setTableName = function (name) {
        if (cname) settings[cname].table = name;
    };

    ctx.Text = Schema.Text;

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

    app.models = {};

    if (!require('path').existsSync(app.root + '/config')) {
        return;
    }

    try {
        config = JSON.parse(fs.readFileSync(app_root + '/config/database.json', 'utf-8'))[env];
    } catch (e) {
        console.log('Could not parse config/database.json');
        throw e;
    }

    var schema = new Schema(config && config.driver || 'memory', config);
    schema.log = log;
    _schemas.push(schema);
    wait += 1;

    schema.on('connected', function () {
        done();
    });

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

    // then run models
    exports.loadModels();

    if (!context.gotSchema) done();

    // and freeze schemas
    _schemas.forEach(function (schema) {
        schema.freeze();
    });

    return result;
};

exports.loadModels = function (cb) {
    var ctx = {};

    Object.keys(app.models).forEach(function (model) {
        ctx[model] = app.models[model];
    });

    ctx.publish = function (name, model) {
        if (typeof name === 'function') {
            model = name;
            name = model.name;
        }
        app.models[name] = model;
        global[name] = model;
    };

    var modelsDir = app.root + '/app/models/';
    if (path.existsSync(modelsDir)) {
        fs.readdirSync(modelsDir).forEach(function (file) {
            if (file.match(/^[^\.].*?\.(js|coffee)$/)) {
                var filename = modelsDir + file;
                runCode(filename, ctx);
            }
        });
    }

    if (cb && cb.call) cb();
};

app.disconnectSchemas = function disconnectSchemas() {
    if (_schemas.length) {
        _schemas.forEach(function (schema) {
            schema.disconnect();
        });
        _schemas = [];
    }
}

