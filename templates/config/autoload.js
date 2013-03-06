module.exports = function (compound) {
    return typeof window === 'undefined' ? [
        '{{ VIEWENGINE }}-ext',
        'jugglingdb',
        'seedjs',
        'co-generators',
        'co-assets-compiler'
    ].map(require) : [
    ];
};

