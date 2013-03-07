var Compound = require('../').Compound;

describe('Compound', function() {

    it('could be created with no app', function() {
        (function() {
            new Compound;
        }).should.not.throw;
    });

    it('should have ability to run tools when instantiated with no app', function () {
        var c = new Compound;
        c.generators.init(c);
        c.generators.list().should.equal('app');
    });

});
