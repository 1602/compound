#!/usr/bin/env node

var app = module.exports = require('railway').createServer();

if (!module.parent) {
    app.listen(process.env.PORT || 3000);
    console.log("Railway server listening on port %d within %s environment", app.address().port, app.settings.env);
}

