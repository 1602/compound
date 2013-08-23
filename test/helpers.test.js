var app, compound;
before(function(done) {
    app = getApp();
    compound = app.compound;
    compound.on('ready', function() {
        done();
    });
});

/*
 * stylesheetLinkTag helper tests
 */
describe('stylesheetLinkTag', function() {
  it('should generate a single tag', function (){
    var match = /\<link media="screen" rel="stylesheet" type="text\/css" href="\/stylesheets\/style\.css" \/\>/;
    var tag = compound.helpers.stylesheetLinkTag('style');

    tag.should.match(match);
  });

  it('should generate multiple tags', function (){
    var match = /<link.*?href="\/stylesheets\/.*?\.css/g;
    var tag = compound.helpers.stylesheetLinkTag('reset', 'bootstrap');

    tag.should.match(match);
    tag.match(match).length.should.equal(2);
  });

  describe('assets timestamps', function() {
    it('should generate a link with a timestamp if enabled');
    it('should generate a link without a timestamp if disabled');
    it('should never add a timestamp to external links');
  });
});

/*
 * javascriptIncludeTag helper tests
 */
describe('javascriptIncludeTag', function() {
  it('should generate a single tag', function (){
    var match = /<script type="text\/javascript" src="\/javascripts\/app\.js">/
    var tag = compound.helpers.javascriptIncludeTag('app');

    tag.should.match(match);
  });

  it('should generate multiple tags', function (){
    var match = /<script.*?src="\/javascripts\/.*?\.js/g
    var tag = compound.helpers.javascriptIncludeTag('rails', 'application');

    tag.should.match(match);
    tag.match(match).length.should.equal(2);
  });

  describe('assets timestamps', function() {
    it('should generate a link with a timestamp if enabled');
    it('should generate a link without a timestamp if disabled');
    it('should never add a timestamp to external links');
  });
});

/*
 * formTag helper tests
 */
describe('formTag', function (){
  before(function() {
    compound.helpers.controller = {
      app: app,
      req: {
        csrfParam: 'param_name',
        csrfToken: 'token_value'
      }
    };
  });

  it('should generate an update form for resource with PUT method', function () {
    var buf = arguments.callee.buf = [];
    var res = {
      constructor: {
        modelName: 'Resource'
      },
      id: 7
    };

    compound.map.pathTo.resource = function (res) {
      return '/resources/' + res.id;
    }

    var f = compound.helpers.formFor(res, {});
    var res = f.begin();
    var expectedFormString = '<form method="POST" action="/resources/7"><input type="hidden" name="param_name" value="token_value" /><input type="hidden" name="_method" value="PUT" />';
    res.should.equal(expectedFormString);
  });

  it('should be able to create inputs without a block', function () {
    var buf = [];
    var res = {
      constructor: {
        modelName: 'Resource'
      },
      id: 7
    };

    compound.map.pathTo.resource = function (res) {
      return '/resources/' + res.id;
    }

    var f = compound.helpers.formFor(res, {});
    buf.push(f.begin());
    buf.push(f.input('name'));
    buf.push(f.input('sub[obj]'));
    buf.push(f.end());

    buf[0].should.equal('<form method="POST" action="/resources/7"><input type="hidden" name="param_name" value="token_value" /><input type="hidden" name="_method" value="PUT" />');
    buf[1].should.equal('<input name="Resource[name]" id="Resource_name" type="text" value="" />');
    buf[2].should.equal('<input name="Resource[sub][obj]" id="Resource_sub_obj" type="text" value="" />');
  });

  it('should allow to override "id" attribute of tag', function() {
      var res = {
          constructor: {
              modelName: 'Resource'
          },
          id: 7
      };
      var f = compound.helpers.formFor(res, {});
      f.textarea('name').should.equal('<textarea name="Resource[name]" id="Resource_name"></textarea>');
      f.textarea('name', {id: 'over'}).should.equal('<textarea name="Resource[name]" id="over"></textarea>');
  });

  it('should work for nested resource', function() {
      var res = {
          constructor: {
              modelName: 'User'
          },
          id: 7,
          address: {
              constructor: 'Address',
              id: 9,
              street: 'Liberty st'
          }
      };
      var f = compound.helpers.formFor(res, {action: '/'});
      var addr = f.fieldsFor('address');
      addr.input('street').should.equal('<input name="User[address][street]" id="User_address_street" type="text" value="Liberty st" />');
  });

});

/*
 * errorMessagesFor helper tests
 */
describe('errorMessagesFor', function () {
  var resource = {
    errors: {
      name: ['can\'t be blank', 'is invalid'],
      email: ['is not unique']
    }
  };
  it('should generate html errors', function () {
    var html = compound.helpers.errorMessagesFor(resource);
    var expectedErrorString = '<div class="alert alert-error"><p><strong>Validation failed. Fix the following errors to continue:</strong></p><ul><li class="error-message">Name can\'t be blank</li><li class="error-message">Name is invalid</li></ul><ul><li class="error-message">Email is not unique</li></ul></div>';
    html.should.equal(expectedErrorString);
  });
});

describe('metaTag', function() {

    it('should generate metaTag(name, content)', function() {
        var result = compound.helpers.metaTag('pageId', 77);
        var expected = '<meta name="pageId" content="77" />';
        result.should.equal(expected);
    });

    it('should generate metaTag(name, params)', function() {
        var result = compound.helpers.metaTag('pageId', {foo: 'bar'});
        var expected = '<meta name="pageId" foo="bar" />';
        result.should.equal(expected);
    });

    it('should generate metaTag(params)', function() {
        var result = compound.helpers.metaTag({name: 'foo', content: 'bar'});
        var expected = '<meta name="foo" content="bar" />';
        result.should.equal(expected);
    });

    it('should generate metaTag()', function() {
        var result = compound.helpers.metaTag();
        var expected = '<meta />';
        result.should.equal(expected);
    });

});
