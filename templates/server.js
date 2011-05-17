#!/usr/bin/env node

var app = module.exports = require('railway').createServer();

if (!module.parent) {
    app.listen(3000);
    console.log("Express server listening on port %d", app.address().port)
}

