module.exports = function (compound) {
    return typeof window === 'undefined' ? [
        'jugglingdb',
        'co-assets-compiler'
    ].concat(compiler.app.get('env') === 'development' ? [
        '{{ VIEWENGINE }}-ext',
        'seedjs',
        'co-generators',
    ] : []).map(require) : [
    ];
};

