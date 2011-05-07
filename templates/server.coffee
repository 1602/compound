#!/usr/bin/env coffee

app = module.exports = require('express').createServer()

require('express-on-railway').init(app)

if not module.parent
    app.listen 3000
    console.log "Express server listening on port %d", app.address().port
