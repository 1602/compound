module.exports = function (compound) {
    return typeof window === 'undefined' ? [
        '{{ VIEWENGINE }}-ext',
        'jugglingdb',
        'seedjs'
    ].map(require) : [
    ];
};

