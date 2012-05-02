express = require 'express'

app.configure ->
    cwd = process.cwd()
    PREPEND_MIDDLEWARE
    app.set 'view engine', 'VIEWENGINE'
    app.set 'view options', complexNames: true
    app.enable 'coffee'

    app.use express.static(cwd + '/public', maxAge: 86400000)
    app.use express.bodyParser()
    app.use express.cookieParser 'secret'
    app.use express.session secret: 'secret'
    app.use express.methodOverride()
    app.use app.router

