var express = require('express');

module.exports = function (compound) {
    var app = compound.app;

    app.configure('test', function(){
        app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
        app.enable('quiet');
        app.enable('view cache');
        app.enable('model cache');
        app.enable('eval cache');
    });

};
