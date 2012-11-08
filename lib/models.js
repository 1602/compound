// Deps
var fs = require('fs'),
    path = require('path'),
    Module = require('module'),
    utils = require('./railway_utils');

/**
 * Initialize models
 *
 * @param {Railway} rw - railway app.
 */
exports.init = function(rw) {
    // quietly fallback to default schema
    try {
        if (!rw.orm) require('jugglingdb').init(rw);
    } catch (e) {}

    // then run models
    loadModels(rw);

};

function loadModels(rw) {
    if (!rw.structure.models) {
        return;
    }

    Object.keys(rw.structure.models).forEach(function(model) {
        var md = rw.structure.models[model];
        if (rw.models[model] && rw.models[model]._validations) {
            delete rw.models[model]._validations;
        }
        if (typeof md === 'function') {
            md(rw, rw.models[model]);
        } else {
            // rw.models[md.name || md.modelName || model] = md;
        }
    });

}

