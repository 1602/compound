module.exports = function (compound) {

    var express = require('express');
    var app = compound.app;

    app.configure(function(){
        {{ PREPEND_MIDDLEWARE }}
        app.use(express.static(app.root + '/public', { maxAge: 86400000 }));
        app.set('jsDirectory', '/javascripts/');
        app.set('cssDirectory', '/stylesheets/');
        app.set('cssEngine', '{{ CSSENGINE }}');
        // make sure you run `npm install browserify uglify-js`
        // app.enable('clientside');
        app.use(express.bodyParser());
        app.use(express.cookieParser('secret'));
        app.use(express.session({secret: 'secret'}));
        app.use(express.methodOverride());
        app.use(app.router);
    });

};
