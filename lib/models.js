function camelize (underscored_str, upcase_first_letter) {
    var res = '';
    underscored_str.split('_').forEach(function (part) {
        res += part[0].toUpperCase() + part.substr(1);
    });
    return upcase_first_letter ? res : res[0].toLowerCase() + res.substr(1);
}

function classify (str) {
    return camelize(singularize(str));
}

var fs = require('fs'),
    Script      = process.binding('evals').Script,
    singularize = require('../vendor/inflection.js').singularize,
    pluralize   = require('../vendor/inflection.js').pluralize;

function prepareContext (to_export, orm) {
    var ctx = {require: require, console: console},
        cname,
        properties = {},
        associations = {};

    ctx.define = function (class_name, callback) {
        cname = class_name;
        properties[cname] = {};
        associations[cname] = {};
        if (!ctx[cname]) {
            ctx[cname] = function () {
                this.initialize.apply(this, Array.prototype.slice.call(arguments));
            };
            ctx[cname].name = cname;
            to_export[cname] = ctx[cname];
        }
        callback();
        orm.mix_persist_methods(ctx[cname], properties[cname], associations[cname]);
        cname = void(0);
    };
    ctx.property = function (name, type, params) {
        if (params) {
            params.type = type;
        } else {
            if (typeof type == 'object') {
                params = type;
            } else {
                params = {type: type};
            }
        }
        properties[cname][name] = params;
    };
    var relation_mapper = function (type) {
        return function (relation, params) {
            if (!params) {
                params = {};
            }
            if (!params.className) {
                params.className = type == 'n' ? classify(relation) : camelize(relation);
            }
            params.relationType = type;
            associations[cname][relation] = params;
        };
    };

    ctx.hasMany   = relation_mapper('n');
    ctx.hasOne    = relation_mapper('1');
    ctx.belongsTo = relation_mapper('<');

    return ctx;
}

/**
 * Initialize models in given directory
 * with data-mapper methods (currently only redis)
 *
 * @param {String} app_root - application root directory
 * @return collection of persistence models
 */
exports.init = function (app_root) {
    var result = {},
        orm_driver = require('../../orm/lib/orm.js'),
        context = prepareContext(result, orm_driver);

    fs.readdirSync(app_root + '/app/models/').forEach(function (file) {
        var filename = app_root + '/app/models/' + file,
            code = fs.readFileSync(filename).toString('utf-8');
        var m = new Script(code, filename);
        m.runInNewContext(context);
    });
    for (var cls in result) {
        // TODO: do we really need to publish models global?
        //       maybe would be better to run controllers in new context.
        global[cls] = result[cls];
    }
};
// exports.init = require('node-redis-mapper').apply_to_models;
