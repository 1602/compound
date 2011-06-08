var mongoose = require('mongoose'),
    sys = require("sys"),
    undef;


exports.configure = function (config) {
    var auth = '', port = '';
    config.host = config.host || 'localhost';
    config.database = config.database || 'default';

    auth = config.user || '';
    if (config.password) {
        auth += ':' + config.password;
    }
    if (auth) {
        auth += '@';
    }
    if (config.port) {
        port = ':' + config.port;
    }

    mongoose.connect(app.settings.mongoUrl || 'mongodb://' + auth + config.host + port + '/' + config.database);
};

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
