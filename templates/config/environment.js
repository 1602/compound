module.exports = function (compound) {

    var express = require('express');
    var app = compound.app;

    app.configure(function(){
        {{ PREPEND_MIDDLEWARE }}
        app.use(express.static(app.root + '/public', { maxAge: 86400000 }));
        app.set('view engine', '{{ VIEWENGINE }}');
        app.set('view options', { complexNames: true });
        app.set('jsDirectory', '/javascripts/');
        app.set('cssDirectory', '/stylesheets/');
        app.set('cssEngine', '{{ CSSENGINE }}');
        app.use(express.bodyParser());
        app.use(express.cookieParser('secret'));
        app.use(express.session({secret: 'secret'}));
        app.use(express.methodOverride());
        app.use(app.router);
    });

};
