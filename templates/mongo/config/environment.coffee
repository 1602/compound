app.settings.db = JSON.parse(require('fs').readFileSync(__dirname + '/database.json', 'utf-8'))[app.settings.env]

mongoStore = require 'connect-mongodb'
express = require 'express'
mongoSessionStore = new mongoStore
    # maxAge:   60000
    dbname:   app.settings.db.database
    host:     app.settings.db.host
    username: app.settings.db.user
    password: app.settings.db.password

app.configure ->
    cwd = process.cwd()
    app.set 'views', cwd + '/app/views'
    app.set 'view engine', 'ejs'

    app.use express.static(cwd + '/public', maxAge: 86400000)
    app.use express.bodyParser()
    app.use express.cookieParser()
    app.use express.session secret: 'secret', store: mongoSessionStore
    app.use express.methodOverride()
    app.use app.router

