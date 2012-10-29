#!/usr/bin/env node

/**
 * Server module exports method which returns new instance of application server
 *
 * @param params - railway/express webserver initialization params
 * @returns RailwayJS powered express webserver
 */
var app = module.exports = function getServerInstance(params) {
    params = params || {};
    // specify current dir as default root of server
    params.root = params.root || __dirname;
    return require('railway').createServer(params);
};

if (!module.parent) {
    var port = process.env.PORT || 3000
    var server = app();
    server.listen(port);
    console.log("RailwayJS server listening on port %d within %s environment", port, server.settings.env);
}

