module.exports = (compound) ->
  app = compound.app
  app.configure 'production', ->
    app.enable 'merge javascripts'
    app.enable 'merge stylesheets'
    app.disable 'assets timestamps'
    app.use require('express').errorHandler()
    app.enable 'quiet'

