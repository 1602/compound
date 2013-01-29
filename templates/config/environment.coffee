module.exports = (compound) ->

  express = require 'express'
  app = compound.app

  app.configure ->
    {{ PREPEND_MIDDLEWARE }}
    app.enable 'coffee'

    app.set 'cssEngine', '{{ CSSENGINE }}'

    # make sure you run `npm install railway-routes browserify`
    # app.enable 'clientside'
    app.use express.static(app.root + '/public', maxAge: 86400000)
    app.use express.bodyParser()
    app.use express.cookieParser 'secret'
    app.use express.session secret: 'secret'
    app.use express.methodOverride()
    app.use app.router
