#!/usr/bin/env coffee

app = module.exports = require('railway').createServer()

if not module.parent
    app.listen 3000
    console.log "Express server listening on port %d", app.address().port
