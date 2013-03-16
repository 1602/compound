module.exports = (compound) ->
  return if typeof window == 'undefined'  then [
    'jugglingdb',
    'co-assets-compiler'
  ].concat( if 'development' == compound.app.get('env') then [
    '{{ VIEWENGINE }}-ext',
    'seedjs',
    'co-generators'
  ] else [] ).map(require) else []