var mongoose = require('mongoose'),
    sys = require("sys"),
    undef;

exports.configure = function (config) {
    config.host = config.host || 'localhost';
    config.database = config.database || 'default';

    mongoose.connect('mongodb://' + config.host + '/' + config.database);
};

exports.prependCode = 'var mongoose = require("mongoose"); var Schema = mongoose.Schema;';
