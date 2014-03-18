
describe('middleware-inject', function() {
describe('Compound.injectMiddleware{At,Before,After}', function() {

    var app, compound;

    before(function () {
        app = getApp();
        compound = app.compound;
    });

    beforeEach(function() {
        app.stack = [
            {handle: function zero() {}},
            {handle: function first() {}},
            {handle: function second() {}},
            {handle: function third() {}},
            {handle: function fourth() {}}
        ];
    });

    it('should inject middleware at position', function() {
        compound.injectMiddlewareAt(1, function my() {});
        app.stack.length.should.equal(6);
        app.stack[1].handle.name.should.equal('my');
        app.stack[2].handle.name.should.equal('first');
        app.stack[3].handle.name.should.equal('second');
        app.stack[4].handle.name.should.equal('third');
        app.stack[5].handle.name.should.equal('fourth');
    });

    it('should inject to end when falsy or too high', function() {
        compound.injectMiddlewareAt(100, function my() {});
        app.stack.length.should.equal(6);
        app.stack[5].handle.name.should.equal('my');
    });

    it('should should inject to beginning when position le 0', function() {
        compound.injectMiddlewareAt(0, function my() {});
        app.stack.length.should.equal(6);
        app.stack[0].handle.name.should.equal('my');
        compound.injectMiddlewareAt(0, function nega() {});
        app.stack.length.should.equal(7);
        app.stack[0].handle.name.should.equal('nega');
        app.stack[1].handle.name.should.equal('my');
    });

    it('should inject middleware before name', function() {
        compound.injectMiddlewareBefore('third', function twoAndHalf() {});
        app.stack.length.should.equal(6);
        app.stack[3].handle.name.should.equal('twoAndHalf');
        app.stack[4].handle.name.should.equal('third');
        app.stack[5].handle.name.should.equal('fourth');
    });

    it('should inject middleware before function', function() {
        var second = app.stack[2].handle;
        compound.injectMiddlewareBefore(second, function mymid() {});
        app.stack.length.should.equal(6);
        app.stack[2].handle.name.should.equal('mymid');
        app.stack[3].handle.name.should.equal('second');
        app.stack[4].handle.name.should.equal('third');
        app.stack[5].handle.name.should.equal('fourth');
    });

    it('should inject middleware after name', function() {
        compound.injectMiddlewareAfter('third', function threeAndHalf() {});
        app.stack.length.should.equal(6);
        app.stack[3].handle.name.should.equal('third');
        app.stack[4].handle.name.should.equal('threeAndHalf');
        app.stack[5].handle.name.should.equal('fourth');
    });

});
});
