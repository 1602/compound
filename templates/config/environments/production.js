var express = require('express');

module.exports = function (compound) {
    var app = compound.app;

    app.configure('production', function () {
        app.enable('quiet');
        app.enable('merge javascripts');
        app.enable('merge stylesheets');
        app.disable('assets timestamps');
        app.use(express.errorHandler());
    });
};
