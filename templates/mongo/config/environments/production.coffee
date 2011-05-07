app.configure 'production', ->
    app.enable 'view cache'
    app.enable 'model cache'
    app.enable 'eval cache'
    app.use require('express').errorHandler()
    app.settings.quiet = true

