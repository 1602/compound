module.exports = function (compound) {
    return [
        require('{{ VIEWENGINE }}-ext'),
        require('jugglingdb'),
        require('seedjs')
    ];
};

