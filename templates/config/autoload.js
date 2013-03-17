module.exports = function (compound) {
  var defaultModules = [
    'jugglingdb',
    'co-assets-compiler'{{ AUTOLOAD_MODULES }}
  ], developmentModules = [];

  if ('development' === compound.app.get('env')) {
    developmentModules = [
      '{{ VIEWENGINE }}-ext',
      'seedjs',
      'co-generators'
    ]
  }

  if (typeof window === 'undefined') {
    return defaultModules.concat(developmentModules).map(require);
  } else {
    return []
  }
};

