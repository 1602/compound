module.exports = function (compound) {
    return typeof window === 'undefined' ? [
        'jugglingdb',
        'co-assets-compiler'
    ].concat('development' == compound.app.get('env') ? [
        '{{ VIEWENGINE }}-ext',
        'seedjs',
        'co-generators',
    ] : []).map(require) : [
    ];
};

