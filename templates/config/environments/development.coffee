express = require 'express'

module.exports = (compound) ->
  app = compound.app
  app.configure 'development', ->
    app.enable 'log actions'
    app.enable 'env info'
    app.enable 'watch'
    app.enable 'force assets compilation'
    app.use express.errorHandler dumpExceptions: true, showStack: true

