module.exports = function (compound) {

    var express = require('express');
    var app = compound.app;

    app.configure(function(){
        app.use(express.static(app.root + '/public', { maxAge: 86400000 }));
        app.set('jsDirectory', '/javascripts/');
        app.set('cssDirectory', '/stylesheets/');
        app.set('cssEngine', '{{ CSSENGINE }}');
        compound.loadConfigs(__dirname);
        app.use(express.urlencoded());
        app.use(express.json());
        app.use(express.cookieParser('secret'));
        app.use(express.session({secret: 'secret'}));
        app.use(express.methodOverride());
        app.use(app.router);
    });

};
