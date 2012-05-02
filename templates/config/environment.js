var express = require('express');

app.configure(function(){
    var cwd = process.cwd();
    PREPEND_MIDDLEWARE
    app.use(express.static(cwd + '/public', {maxAge: 86400000}));
    app.set('view engine', 'VIEWENGINE');
    app.set('view options', {complexNames: true});
    app.set('jsDirectory', '/javascripts/');
    app.set('cssDirectory', '/stylesheets/');
    app.use(express.bodyParser());
    app.use(express.cookieParser('secret'));
    app.use(express.session({secret: 'secret'}));
    app.use(express.methodOverride());
    app.use(app.router);
});

