var Compound = require('../').Compound;
var should = require('should');

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

    it('should allow to find model by name', function() {
        var c = new Compound;
        c.models = {Model: function Model() {}, ModelTwo: true};
        should.exist(c.model('Model'));
        should.exist(c.model('model'));
        should.not.exist(c.model('model', true));
        should.exist(c.model('ModelTwo'), true);

        // add model as named fn
        should.not.exist(c.model('ModelThree'));
        c.model(function ModelThree(){});
        should.exist(c.model('ModelThree'));

        // add model as jugglingdb model
        var model = function(){};
        model.modelName = 'HelloJuggling';
        c.model(model);
        should.exist(c.model('HelloJuggling'));

        // throws when model is not named
        (function() {
            c.model(function() {});
        }).should.throw('Named function or jugglingdb model required');

    });

});
