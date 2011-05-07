var express = require('express'),
    app = module.exports = express.createServer();

app.configure('development', function(){
    app.disable('view cache');
    app.disable('model cache');
    app.disable('eval cache');
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
    app.enable('view cache');
    app.enable('model cache');
    app.enable('eval cache');
    app.use(express.errorHandler());
    app.settings.quiet = true;
});

require("express-on-railway").init(__dirname, app);

// Only listen on $ node app.js

if (!module.parent) {
    app.listen(3000);
    console.log("Express server listening on port %d", app.address().port)
}
