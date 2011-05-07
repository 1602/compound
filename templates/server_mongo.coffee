#!/usr/bin/env coffee
express = require 'express'

app = module.exports = express.createServer()
mongoStore = require 'connect-mongodb'

app.settings.db = JSON.parse(require('fs').readFileSync(__dirname + '/config/database.json', 'utf-8'))[app.settings.env]

mongoSessionStore = mongoStore
    # maxAge:   60000
    dbname:   app.settings.db.database
    host:     app.settings.db.host
    username: app.settings.db.user
    password: app.settings.db.password

app.configure ->
    cwd = process.cwd()
    app.set 'views', cwd + '/app/views'
    app.set 'view engine', 'ejs'

    app.use express.static cwd + '/public'
    app.use express.bodyParser()
    app.use express.cookieParser()
    app.use express.session secret: 'secret', store: mongoSessionStore
    app.use express.methodOverride()
    app.use app.router

app.configure 'development', ->
    app.disable 'view cache'
    app.disable 'model cache'
    app.disable 'eval cache'
    app.use express.errorHandler dumpExceptions: true, showStack: true

app.configure 'staging', ->
    app.use express.errorHandler dumpExceptions: true, showStack: true

app.configure 'test', ->
    app.use express.errorHandler dumpExceptions: true, showStack: true
    app.settings.quiet = true

app.configure 'production', ->
    app.enable 'view cache'
    app.enable 'model cache'
    app.enable 'eval cache'
    app.use express.errorHandler()
    app.settings.quiet = true

require("express-on-railway").init(__dirname, app)

if not module.parent
    app.listen 3000
    console.log "Express server listening on port %d", app.address().port
