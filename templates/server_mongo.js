/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer(),
    mongoStore = require('connect-mongodb');

app.settings.db = JSON.parse(require('fs').readFileSync(__dirname + '/config/database.json', 'utf-8'))[app.settings.env];

var mongoSessionStore = mongoStore({
    // maxAge:   60000,
    dbname:   app.settings.db.database,
    host:     app.settings.db.host,
    username: app.settings.db.user,
    password: app.settings.db.password
}, function () {});

app.configure(function(){
    app.use(express.staticProvider(__dirname + '/public'));
    app.set('views', __dirname + '/app/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyDecoder());
    app.use(express.cookieDecoder());
    app.use(express.session({store: mongoSessionStore}));
    app.use(express.methodOverride());
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('staging', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('test', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.settings.quiet = true;
});

app.configure('production', function(){
    app.use(express.errorHandler());
    app.settings.quiet = true;
});

require("express-on-railway").init(__dirname, app);

// Only listen on $ node app.js

if (!module.parent) {
    app.listen(3000);
    console.log("Express server listening on port %d", app.address().port)
}
