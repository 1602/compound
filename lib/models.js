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

function underscore (camelCaseStr) {
    return camelCaseStr
        .replace(/([a-z]+)([A-Z][a-z])/g, '\1_\2')
        .toLowerCase();
}

var fs = require('fs'),
    Script      = require('vm').Script,
    singularize = require('../vendor/inflection.js').singularize,
    pluralize   = require('../vendor/inflection.js').pluralize;

function prepareContext (to_export, orm) {
    var ctx = {require: require, console: console, Buffer: Buffer},
        cname, tableName, foreignKey,
        properties = {},
        associations = {},
        scopes = {};

    ctx.describe = function (class_name, callback) {
        cname = class_name;
        properties[cname] = {};
        associations[cname] = {};
        if (!ctx[cname]) {
            ctx[cname] = function () {
                this.initialize.apply(this, Array.prototype.slice.call(arguments));
            };
            to_export[cname] = ctx[cname];
        }
        callback();
        orm.mixPersistMethods(ctx[cname], {
            className:     cname,
            tableName:     tableName || underscore(cname),
            foreignKey:    foreignKey,
            properties:    properties[cname],
            associations:  associations[cname],
            scopes:        scopes[cname]
        });
        foreignKey = tableName = cname = void(0);
        return ctx[class_name];
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
            if (type == '<' && !params.foreignKey) {
                params.foreignKey = underscore(params.className) + '_id';
            }
            params.relationType = type;
            associations[cname][relation] = params;
        };
    };

    ctx.hasMany   = relation_mapper('n');
    ctx.hasOne    = relation_mapper('1');
    ctx.belongsTo = relation_mapper('<');

    ctx.scope = function (name, params/*, block*/) {
        params = params || {};
        scopes[cname][name] = params;
    };

    ctx.method = function (name, fun) {
        ctx[class_name].prototype[name] = fun;
    };

    ctx.classMethod = function (name, fun) {
        if (name == 'prototype' || name == 'constructor') {
            throw new Error('Not allowed class method name: ' + name);
        }
        ctx[class_name][name] = fun;
    }

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
    var result = {}, ormDriver, context, config, env = process.env.NODE_ENV || 'development';
    
    try {
        config = JSON.parse(fs.readFileSync(app_root + '/config/database.json'))[env];
    } catch (e) {
        console.log('Could not find database config in `config/database.json` for NODE_ENV = ' + env);
        return;
    }
    orm_driver = require('./datamapper/' + config.driver);
    if (orm_driver.configure) {
        orm_driver.configure(config);
    }
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
