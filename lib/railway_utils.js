var undef;

exports.html_tag_params = function (params, override) {
    var maybe_params = '';
    safe_merge(params, override);
    for (var key in params) {
        if (params[key] != undef) {
            maybe_params += ' ' + key + '="' + params[key].toString().replace(/"/g, '\\"').replace(/\\"/g, '\\\\"') + '"';
        }
    }
    return maybe_params;
};

var safe_merge = exports.safe_merge = function (merge_what) {
    merge_what = merge_what || {};
    Array.prototype.slice.call(arguments).forEach(function (merge_with, i) {
        if (i == 0) return;
        for (var key in merge_with) {
            if (!merge_with.hasOwnProperty(key) || key in merge_what) continue;
            merge_what[key] = merge_with[key];
        }
    });
    return merge_what;
};

exports.humanize = function (underscored) {
    var res = underscored.replace(/_/g, ' ');
    return res[0].toUpperCase() + res.substr(1);
};

exports.camelize = function (underscored, upcaseFirstLetter) {
    var res = '';
    underscored.split('_').forEach(function (part) {
        res += part[0].toUpperCase() + part.substr(1);
    });
    return upcaseFirstLetter ? res : res[0].toLowerCase() + res.substr(1);
};

exports.classify = function (str) {
    return exports.camelize(exports.singularize(str));
};

exports.underscore = function (camelCaseStr) {
    return camelCaseStr
        .replace(/([a-z]+)([A-Z][a-z])/g, '\1_\2')
        .toLowerCase();
};

exports.singularize = require('../vendor/inflection.js').singularize,
exports.pluralize   = require('../vendor/inflection.js').pluralize;
