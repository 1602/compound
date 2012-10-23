// Deps
var fs          = require('fs'),
    path        = require('path'),
    Module      = require('module'),
    utils       = require('./railway_utils');

/**
 * Initialize models
 */
module.exports = function (rw) {
    return function () {
        // quietly fallback to default schema
        try {
            if (!rw.orm) require('jugglingdb').init(rw.root);
        } catch (e) {}

        // then run models
        loadModels(rw);
    }
};

function loadModels(rw) {
    var ctx = {};

    Object.keys(app.models).forEach(function (model) {
        ctx[model] = app.models[model];
    });

    if (!rw.structure.models) return;

    Object.keys(rw.structure.models).forEach(function (model) {
        if (rw.models[model]) {
            if (rw.models[model]._validations) {
                delete rw.models[model]._validations;
            }
            rw.structure.models[model](rw, rw.models.model);
        } else {
            rw.structure.models[model](rw);
        }
    });

};

