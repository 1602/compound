var fs          = require('fs'),
    // import railway utils
    utils       = require('./railway_utils'),
    camelize    = utils.camelize,
    classify    = utils.classify,
    underscore  = utils.underscore,
    singularize = utils.singularize,
    pluralize   = utils.pluralize,
    runCode     = utils.runCode;

function prepareContext (to_export, orm) {
    var ctx = {},
        models = {}, cname;

    if (orm.prepareContext) {
        orm.prepareContext(ctx, to_export);
    }

    ctx.describe = function (class_name, callback) {
        cname = class_name;
        if (!ctx[cname]) {
            ctx[cname] = function () {
                this.initialize.apply(this, Array.prototype.slice.call(arguments));
            };
            to_export[cname] = ctx[cname];
        }
        models[cname] = {
            className:      cname,
            properties:     {},
            associations:   {},
            scopes:         {},
            classObject:    ctx[cname],
            tableName:      underscore(cname),
            implementation: callback,
            primaryKey:     'id'
        };
        return ctx[cname];
    };

    ctx.export = function (name, model) {
        models[name] = model;
        to_export[name] = model;
    };

    ctx.runImplementation = function () {
        if (orm.mixPersistMethods) {
            Object.keys(models).forEach(function (name) {
                cname = name;
                var classDefinition = models[name];
                classDefinition.implementation();
                orm.mixPersistMethods(ctx[cname], {
                    className:    classDefinition.className,
                    tableName:    classDefinition.tableName,
                    primaryKey:   classDefinition.primaryKey,
                    properties:   classDefinition.properties,
                    associations: classDefinition.associations,
                    scopes:       classDefinition.scopes
                });
            });
        }
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
        models[cname].properties[name] = params;
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
            models[cname].associations[relation] = params;
        };
    };

    ctx.hasMany   = relation_mapper('n');
    ctx.hasOne    = relation_mapper('1');
    ctx.belongsTo = relation_mapper('<');

    ctx.scope = function (name, params/*, block*/) {
        params = params || {};
        models[cname].scopes[name] = params;
    };

    ctx.method = function (name, fun) {
        ctx[cname].prototype[name] = fun;
    };

    ctx.classMethod = function (name, fun) {
        if (name == 'prototype' || name == 'constructor') {
            throw new Error('Not allowed class method name: ' + name);
        }
        ctx[cname][name] = fun;
    };

    ctx.tableName = function (name) {
        models[cname].tableName = name;
    };

    ctx.primaryKey = function (name) {
        models[cname].primaryKey = name;
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

    try {
        orm_driver = require('./datamapper/' + config.driver);
    } catch (e) {
        console.log('WARNING: Could not load orm driver ' + config.driver);
        console.log(e.message);
        console.log(e.stack);
        return;
    }
    if (orm_driver.configure) {
        orm_driver.configure(config);
    }
    context = prepareContext(result, orm_driver);
    context.app = app;
    if (process.cov) {
        context.__cov = __cov;
    }

    var code = [];
    fs.readdirSync(app_root + '/app/models/').forEach(function (file) {
        if (file.match(/^[^\.].*?\.(js|coffee)$/)) {
            var filename = app_root + '/app/models/' + file;
            if (orm_driver.runModelsSeparately) {
                runCode(filename, context);
            } else {
                code.push(fs.readFileSync(filename).toString('utf-8'));
            }
        }
    });

    if (orm_driver.prependCode) {
        code.unshift(orm_driver.prependCode);
    }

    if (!orm_driver.runModelsSeparately) {
        var Script = require('vm').Script;
        var m = new Script(code.join('\n'));
        m.runInNewContext(context);
    }

    for (var cls in result) {
        // TODO: do we really need to publish models global?
        //       maybe would be better to run routes in new context.
        global[cls] = result[cls];
    }
    global.models = result;
    app.models = result;
    context.runImplementation();
    return result;
};
