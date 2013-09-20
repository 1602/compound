var should = require('./init.js');
var app, compound;

describe('utilities', function () {
    before(function() {
        app = getApp();
        compound = app.compound;
    });

    it('should camelize string', function () {
        var cc = compound.utils.camelize;
        cc('underscored_string').should.equal('underscoredString');
        cc('underscored_string', 1).should.equal('UnderscoredString');
    });

    it('should humanize string', function () {
        var hs = compound.utils.humanize;
        hs('hey_man').should.equal('Hey man');
    });

    it('should classify string', function () {
        var hs = compound.utils.classify;
        hs('bio_robots').should.equal('bioRobot');
    });

    it('should underscore string', function () {
        var us = compound.utils.underscore;
        us('IAmARobot').should.equal('i_am_a_robot');
        us('_IAmARobot').should.equal('_i_am_a_robot');
        us('_iAmARobot').should.equal('_i_am_a_robot');
    });

    it('should add spaces', function () {
        compound.utils.addSpaces('hello', 8).should.equal('hello   ');
        compound.utils.addSpaces('hello', 8, true).should.equal('   hello');
    });

    describe('utils#inherits', function() {

        it('should inherit superclass', function() {
            function MyClass(){}
            SuperClass.classMethod = function(){};
            function SuperClass(){}
            compound.utils.inherits(MyClass, SuperClass);
            var myObj = new MyClass;
            myObj.should.be.an.instanceOf(SuperClass);
            MyClass.super_.should.equal(SuperClass);
            should.not.exists(MyClass.classMethod);
        });

        it('should inherit superclass with class methods', function() {
            function MyClass(){}
            SuperClass.classMethod = function(){};
            function SuperClass(){}
            compound.utils.inherits(MyClass, SuperClass, true);
            var myObj = new MyClass;
            myObj.should.be.an.instanceOf(SuperClass);
            MyClass.super_.should.equal(SuperClass);
            should.exists(MyClass.classMethod);
        });

    });
});

