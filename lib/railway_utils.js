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
}

var safe_merge = exports.safe_merge = function (merge_what) {
    Array.prototype.slice.call(arguments).forEach(function (merge_with, i) {
        if (i == 0) return;
        for (var key in merge_with) {
            if (!merge_with.hasOwnProperty(key) || key in merge_what) continue;
            merge_what[key] = merge_with[key];
        }
    });
    return merge_what;
}
