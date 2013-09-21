var express = require('express');

module.exports = function (compound) {
    var app = compound.app;

    app.configure('development', function () {
        app.enable('watch');
        app.enable('log actions');
        app.enable('env info');
        app.enable('force assets compilation');
        app.set('translationMissing', 'display');
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    });
};
