// Deps
var fs          = require('fs'),
    path        = require('path'),
    Module      = require('module'),
    utils       = require('./railway_utils');

/**
 * Initialize models
 */
exports.init = function (root) {
    // code coverage support
    if (process.cov) context.__cov = __cov;

    // quietly fallback to default schema
    try {
        if (!railway.orm) require('jugglingdb').init(root);
    } catch(e) {}

    // then run models
    exports.loadModels(root + '/app/models/');

};

global.publish = function (name, model) {
    console.log('WARNING: `publish` call inside model files deprecated now, use module.exports = MyModel in case of declaring new model in app/models/*.js file, and not in db/schema.js');
    if (typeof name === 'function') {
        model = name;
        name = model.name;
    }
    app.models[name] = model;
    global[name] = model;
};

exports.loadModels = function (modelsDir) {
    var ctx = {};

    Object.keys(app.models).forEach(function (model) {
        ctx[model] = app.models[model];
        if (ctx[model]._validations) delete ctx[model]._validations;
    });

    if (railway.utils.existsSync(modelsDir)) {
        fs.readdirSync(modelsDir).forEach(function (file) {
            if (file.match(/^[^\.].*?\.(js|coffee)$/)) {
                var filename = path.join(modelsDir, file);
                delete Module._cache[filename];
                var m = require(filename);
                if (m && (m.name || m.modelName)) {
                    var name = m.modelName || m.name;
                    app.models[name] = m;
                    global[name] = m;
                }
            }
        });
    }

};

app.disconnectSchemas = function disconnectSchemas() {
    if (_schemas.length) {
        _schemas.forEach(function (schema) {
            schema.disconnect();
        });
        _schemas = [];
    }
}

