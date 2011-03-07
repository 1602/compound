var mongoose = require('mongoose'),
    sys = require("sys"),
    undef;

exports.configure = function (config) {
    config.host = config.host || 'localhost';
    config.database = config.database || 'default';

    mongoose.connect('mongodb://' + config.host + '/' + config.database);
};

// exports.prependCode = 'var mongoose = require("mongoose"); var Schema = mongoose.Schema, ObjectId = Schema.ObjectId;';

exports.prepareContext = function (context, export) {
    try {
        var schema = require(app.root + '/db/schema.js');
        for (var i in schema) {
            context[i] = schema[i];
            export[i]  = schema[i];
        }
    } catch (e) {
        if (e.message.match(/Cannot find module/)) {
            console.log('Database schema is not defined in ' + app.root + '/db/schema.js');
        } else {
            throw e;
        }
    }
};

exports.runModelsSeparately = true;
