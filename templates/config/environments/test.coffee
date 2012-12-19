express = require 'express'

module.exports = (compound) ->
  app = compound.app
  app.configure 'test', ->
    app.use express.errorHandler dumpExceptions: true, showStack: true
    app.enable 'quiet'
    app.enable 'view cache'
    app.enable 'model cache'
    app.enable 'eval cache'
