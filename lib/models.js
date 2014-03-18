// Deps
var fs = require('fs'),
    path = require('path');

/**
 * Initialize models with validations and implementation
 *
 * @param {Compound} compound - compound app.
 */
module.exports = function loadModels(compound, root) {
    if (!compound.structure.models) {
        return;
    }

    Object.keys(compound.structure.models).forEach(function(model) {
        var md = compound.structure.models[model];
        var foundModel = compound.model(model);
        if (foundModel && foundModel._validations) {
            delete foundModel._validations;
        }
        if (typeof md === 'function') {
            md(compound, foundModel);
        } else {
            // rw.models[md.name || md.modelName || model] = md;
        }
    });

};

