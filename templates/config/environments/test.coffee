app.configure 'test', ->
    app.use require('express').errorHandler dumpExceptions: true, showStack: true
    app.settings.quiet = true

