// Deps
var fs = require('fs'),
    path = require('path'),
    Module = require('module'),
    utils = require('./utils');

/**
 * Initialize models
 *
 * @param {Compound} rw - compound app.
 */
exports.init = function(rw) {
    // then run models
    loadModels(rw);

};

function loadModels(rw) {
    if (!rw.structure.models) {
        return;
    }

    Object.keys(rw.structure.models).forEach(function(model) {
        var md = rw.structure.models[model];
        model = model.toLowerCase();
        var foundModel;
        for (var i in rw.models) {
            if (model === i.toLowerCase()) {
                foundModel = rw.models[i];
            }
        }
        if (foundModel && foundModel._validations) {
            delete foundModel._validations;
        }
        if (typeof md === 'function') {
            md(rw, foundModel);
        } else {
            // rw.models[md.name || md.modelName || model] = md;
        }
    });

}

