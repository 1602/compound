var path = require('path');
exports.readFileSync = function (path) {
    return window.files[path];
};

exports.existsSync = function (name) {
    if (name in window.files) return true;
    var dirFound = false;
    Object.keys(window.files).forEach(function (dir) {
        if (path.dirname(dir).indexOf(name) !== -1) {
            dirFound = true;
        }
    });
    return dirFound;
};

exports.readdirSync = function (name) {
    var res = [];
    name = name.replace(/\/$/, '');
    Object.keys(window.files).forEach(function (file) {
        if (path.dirname(file) === name) {
            res.push(path.basename(file));
        }
    });
    return res;
};
