var jdb = require('jugglingdb');
var Schema = jdb.Schema;
var WebServiceAdapter = require('../../../node_modules/jugglingdb/lib/adapters/http');

exports.init = function (compound) {
    // load models and schema

    var schema = new Schema(WebServiceAdapter);
    var fn = new Function('context', 'require', 'with(context){(function(){' + compound.files[compound.root + '/db/schema.js'] + '})()}');
    fn(context(compound.models, compound, compound.app, schema), require);
};


function context(models, railway, app, defSchema, done) {
    var ctx = {app: app},
        _models = {},
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
        schema = new Schema(WebServiceAdapter, opts);
        railway.orm._schemas.push(schema);
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
        // console.log(className);
        var m;
        cname = className;
        _models[cname] = {};
        settings[cname] = {};
        if (nonJugglingSchema) {
            m = callback;
        } else {
            callback && callback();
            m = (schema || defSchema).define(className, _models[cname], settings[cname]);
        }
        if (global.railway) {
            global[cname] = m;
        }
        return models[cname] = ctx[cname] = m;
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
        _models[cname][name] = params;
    };

    /**
     * Set custom table name for current class
     * @param name - name of table
     */
    ctx.setTableName = function (name) {
        if (cname) settings[cname].table = name;
    };

    /**
     * If the Schema has additional types, add them to the context
     * e.g. MySQL has an additional Point type
     */
    if (Schema.types && Object.keys(Schema.types).length) {
        for (var typeName in Schema.types) {
            ctx[typeName] = Schema.types[typeName];
        }
    }
    ctx.Text = Schema.Text;

    /**
     * Specify rest path for client-side models
     */
    ctx.restPath = function (path) {
        if (cname) settings[cname].restPath = path;
    };

    ctx.set = function (k, v) {
        if (cname) settings[cname][k] = v;
    };

    ctx.pathTo = compound.map.pathTo || {};

    return ctx;

    function argument(type) {
        var r;
        [].forEach.call(arguments.callee.caller.arguments, function (a) {
            if (!r && typeof a === type) r = a;
        });
        return r;
    }
}
