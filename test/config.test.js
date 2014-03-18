var should = require('./init.js');

describe('compound.loadConfigs', function() {
    it('should load configs from given directory', function() {
        var app = getApp();
        var compound = app.compound;
        compound.loadConfigs(__dirname + '/fixtures/config');
        should.exists(app.get('database'), 'load database config');
        app.get('database').driver.should.equal('memory');
        should.exists(app.get('foo'), 'load extra config');
        app.get('foo').should.equal('bar');
        should.not.exists(app.get('hello'));
    });
});
