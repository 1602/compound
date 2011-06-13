mongoStore = require 'connect-mongodb'
express    = require 'express'

if process.env.MONGOHQ_URL
    app.settings.mongoUrl = process.env.MONGOHQ_URL
    m = require('url').parse process.env.MONGOHQ_URL
    app.settings.db =
        driver:   'mongoose'
        database: m.pathname.replace(/^\//, '')
        port:     m.port
        host:     m.hostname
        user:     m.auth.split(':')[0]
        password: m.auth.split(':')[1]
else
    app.settings.db = JSON.parse(require('fs').readFileSync(__dirname + '/database.json', 'utf-8'))[app.settings.env]

mongoSessionStore = new mongoStore
    dbname:   app.settings.db.database
    host:     app.settings.db.host
    port:     app.settings.db.port
    username: app.settings.db.user
    password: app.settings.db.password

app.configure ->
    cwd = process.cwd()
    app.set 'views', cwd + '/app/views'
    app.set 'view engine', 'VIEWENGINE'
    app.enable 'coffee'

    app.use express.static(cwd + '/public', maxAge: 86400000)
    app.use express.bodyParser()
    app.use express.cookieParser()
    app.use express.session secret: 'secret', store: mongoSessionStore
    app.use express.methodOverride()
    app.use app.router

