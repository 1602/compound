require('./spec_helper').init exports

require('../lib/onrailway').createServer()

context 'stylesheet_link_tag', ->

    it 'should generate single tag', (test) ->

        app.set 'env', 'test'
        tag = railway.helpers.stylesheet_link_tag 'style'
        reLinkTs = /\<link media="screen" rel="stylesheet" type="text\/css" href="\/stylesheets\/style\.css\?\d+" \/\>/
        test.ok tag.match reLinkTs, 'Link with timestamp param in development'

        app.set 'env', 'production'
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

        app.set 'env', 'test'
        tag = railway.helpers.javascript_include_tag 'app'
        reLinkTs = /<script type="text\/javascript" src="\/javascripts\/app\.js\?\d+">/
        test.ok tag.match reLinkTs, 'Link with timestamp param in development'

        app.set 'env', 'production'
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

