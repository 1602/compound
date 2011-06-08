#!/usr/bin/env coffee

app = module.exports = require('railway').createServer()

if not module.parent
    app.listen process.env.PORT or 3000
    console.log "Railway server listening on port %d", app.address().port
