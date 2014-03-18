module.exports = require('should');

process.env.NODE_ENV = 'test';

if (!process.env.TRAVIS) {
    if (typeof __cov === 'undefined') {
        process.on('exit', function () {
            require('semicov').report();
        });
    }

    require('semicov').init('lib');
}

global.getApp = function() {
    var app = require('../').createServer()
    app.enable('quiet');
    return app;
};
