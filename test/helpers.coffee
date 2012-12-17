require('./spec_helper').init exports

context = global.context
it = global.it

context 'stylesheet_link_tag', ->

    it 'should generate single tag', (test) ->

        app.enable 'assets timestamps'
        tag = railway.helpers.stylesheet_link_tag 'style'
        reLinkTs = /\<link media="screen" rel="stylesheet" type="text\/css" href="\/stylesheets\/style\.css\?\d+" \/\>/
        test.ok tag.match reLinkTs, 'Link with timestamp param in development'

        app.disable 'assets timestamps'
        reLinkNoTs = /\<link media="screen" rel="stylesheet" type="text\/css" href="\/stylesheets\/style\.css" \/\>/
        tag = railway.helpers.stylesheet_link_tag 'style'
        test.ok tag.match reLinkNoTs, 'Link without timestamp in production'

        test.done()

    it 'should generate multiple tags', (test) ->

        app.set 'env', 'test'
        tag = railway.helpers.stylesheet_link_tag 'reset', 'bootstrap'
        m = tag.match /<link.*?href="\/stylesheets\/.*?\.css/g
        test.equal m && m.length, 2

        test.done()

    it 'shouldn\'t add timestamp param to exteral links', (test) ->

        app.set 'env', 'test'
        tag = railway.helpers.stylesheet_link_tag 'http://example.com/style.css'
        reLinkNoTs = /<link.*?href="http:\/\/example\.com\/style\.css" \/>/
        test.ok reLinkNoTs
        test.done()

context 'javascript_include_tag', (test) ->

    it 'should generate single tag', (test) ->

        app.enable 'assets timestamps'
        tag = railway.helpers.javascript_include_tag 'app'
        reLinkTs = /<script type="text\/javascript" src="\/javascripts\/app\.js\?\d+">/
        test.ok tag.match reLinkTs, 'Link with timestamp param in development'

        app.disable 'assets timestamps'
        reLinkNoTs = /<script type="text\/javascript" src="\/javascripts\/app\.js">/
        tag = railway.helpers.javascript_include_tag 'app'
        test.ok tag.match reLinkNoTs, 'Link without timestamp in production'

        test.done()

    it 'should generate multiple tags', (test) ->

        app.set 'env', 'test'
        tag = railway.helpers.javascript_include_tag 'rails', 'application'
        m = tag.match /<script.*?src="\/javascripts\/.*?\.js/g
        test.equal m && m.length, 2

        test.done()

    it 'shouldn\'t add timestamp param to exteral links', (test) ->

        app.set 'env', 'test'
        tag = railway.helpers.javascript_include_tag 'http://example.com/script.js'
        reLinkNoTs = /<script.*?src="http:\/\/example\.com\/script\.js" \/>/
        test.ok reLinkNoTs
        test.done()

context 'formTag', (test) ->
    railway.helpers.controller =
        app: app
        req:
            csrfParam: 'param_name'
            csrfToken: 'token_value'

    it 'should generate form', (test) ->
        buf = arguments.callee.buf = []
        railway.helpers.formTag()
        test.equal(buf[0], '<form method="POST"><input type="hidden" name="param_name" value="token_value" />')
        test.done()

    it 'should generate form with custom method', (test) ->
        buf = arguments.callee.buf = []
        railway.helpers.formTag({method: 'PUT'})
        test.equal(buf[0], '<form method="POST"><input type="hidden" name="param_name" value="token_value" /><input type="hidden" name="_method" value="PUT" />')
        test.done()

    it 'should accept passed block', (test) ->
        buf = arguments.callee.buf = []
        railway.helpers.formTag ->
            buf.push 'BLOCK CONTENTS'
        test.equal(buf[0], '<form method="POST"><input type="hidden" name="param_name" value="token_value" />')
        test.equal(buf[1], 'BLOCK CONTENTS')
        test.done()

    it 'should generate update form for resource with PUT method', (test) ->
        buf = arguments.callee.buf = []
        res = {modelName: 'Resource', id: 7}
        railway.routeMapper.pathTo.resource = (res) ->
             "/resources/#{res.id}"

        railway.helpers.formFor res, {}, (f) -> return
        test.equal(buf[0], '<form method="POST" action="/resources/7"><input type="hidden" name="param_name" value="token_value" /><input type="hidden" name="_method" value="PUT" />')
        test.done()

    it 'should be able to create inputs without a block', (test) ->
        buf = arguments.callee.buf = []
        res = { modelName: 'Resource', id: 7 }
        railway.routeMapper.pathTo.resource = (res) ->
            "/resources/#{res.id}"

        f = railway.helpers.formFor res, {}
        buf.push f.begin()
        buf.push f.end()

        test.equal(buf[0], '<form method="POST" action="/resources/7"><input type="hidden" name="param_name" value="token_value" /><input type="hidden" name="_method" value="PUT" />')

        test.done()

context 'errorMessagesFor', (test) ->
    resource =
        errors:
            name:
                ['can\'t be blank', 'is invalid']
            email:
                ['is not unique']

    it 'should generate errors html', (test) ->
        html = railway.helpers.errorMessagesFor resource
        test.equal html, '<div class="alert alert-error"><p><strong>Validation failed. Fix following errors before you continue:</strong></p><ul><li class="error-message">Name can\'t be blank</li><li class="error-message">Name is invalid</li></ul><ul><li class="error-message">Email is not unique</li></ul></div>'
        test.done()
