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
    Scirpt = process.binging('evals').Script,
    singularize = require('../vendor/inflection.js').singularize,
    pluralize = require('../vendor/inflection.js').pluralize;

function prepare_context (to_export) {
    var ctx = {},
        cname,
        properties = {},
        associations = {};

    ctx.define = function (class_name, callback) {
        cname = class_name;
        properties[cname] = {};
        associations[cname] = {};
        if (!this[cname]) {
            this[cname] = function () {};
            this[cname].name = cname;
            to_export[cname] = this[cname];
        }
        callback();
        cname = void(0);
        console.log(properties);
        console.log(associations);
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
            if (!params.class_name) {
                params.class_name = type == 'n' ? classify(relation) : camelize(relation);
            }
            params.relation_type = type;
            associations[cname][relation] = params;
        };
    };

    ctx.has_many = relation_mapper('n');
    ctx.has_one = relation_mapper('1');
    ctx.belongs_to = relation_mapper('<');

/**
 * Initialize models in given directory
 * with data-mapper methods (currently only redis)
 *
 * @param {String} app_root - application root directory
 * @return collection of persistence models
 */
exports.init = function (app_root) {
    var result = {};
    var context = prepare_context(result);
    fs.readdirSync(app_root + '/app/models/').forEach(function (file) {
        var filename = app_root + '/app/models/' + file,
        code = fileReadSync(filename).toString('utf-8');
        Script.runInContext(code, context, filename);
    });
    console.log(result);
};
// exports.init = require('node-redis-mapper').apply_to_models;
