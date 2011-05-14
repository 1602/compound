var mongoStore = require('connect-mongodb');
var express = require('express');

app.settings.db = JSON.parse(require('fs').readFileSync(__dirname + '/database.json', 'utf-8'))[app.settings.env];

var mongoSessionStore = new mongoStore({
    // maxAge:   60000,
    dbname:   app.settings.db.database,
    host:     app.settings.db.host,
    username: app.settings.db.user,
    password: app.settings.db.password
}, function () {});

app.configure(function(){
    var cwd = process.cwd();
    app.use(express.static(cwd + '/public'));
    app.set('views', cwd + '/app/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secret', store: mongoSessionStore}));
    app.use(express.methodOverride());
    app.use(app.router);
});

