module.exports = (compound) ->
  [
    require('{{ VIEWENGINE }}-ext'),
    require('jugglingdb'),
    require('seedjs'),
    require('co-generators'),
    require('co-assets-compiler')
  ]
