var utils = require('./railway_utils'),
    html_tag_params = utils.html_tag_params,
    safe_merge = utils.safe_merge,
    humanize   = utils.humanize,
    undef;

var generic_tag = function (name, inner, params, override) {
    return '<' + name + html_tag_params(params, override) + '>' + inner + '</' + name + '>';
};

var generic_sc_tag = function (name, params, override) {
    return '<' + name + html_tag_params(params, override) + ' />';
};

var data_param = function (key) {
    if (this[key]) {
        this['data-' + key] = this[key];
        delete this[key];
    }
};

exports.stylesheet_link_tag = function () {
    //<link href="/stylesheets/all.css"  media="screen" rel="stylesheet" type="text/css" />
    var args = Array.prototype.slice.call(arguments);
    var options = {media: 'screen', rel: 'stylesheet', type: 'text/css'};
    if (typeof args[args.length - 1] == 'object') {
        options = safe_merge(options, args.pop());
    }
    var links = [];
    args.forEach(function (file) {
        delete options.href;
        links.push(generic_sc_tag('link', options, {href: "/stylesheets/" + file + ".css?" + (new Date).getTime()}));
    });
    return links.join('\n    ');
};

// <script type="text/javascript" src="/javascripts/application.js"></script>
exports.javascript_include_tag = function () {
    var args = Array.prototype.slice.call(arguments);
    var options = {type: 'text/javascript'};
    if (typeof args[args.length - 1] == 'object') {
        options = safe_merge(options, args.pop());
    }
    var scripts = [];
    args.forEach(function (file) {
        var href = file.match(/^https?:\/\//) ? file : "/javascripts/" + file + ".js?" + (new Date).getTime();
        delete options.src;
        scripts.push(generic_tag('script', '', options, {src: href}));
    });
    return scripts.join('\n    ');
};

exports.link_to = function (text, url, params) {
    ['remote', 'method', 'jsonp'].forEach(data_param.bind(params));
    return generic_tag('a', text, {href: url}, params);
};

exports.form_for = function (resource, params, block) {
    var buf = arguments.callee.caller.buf;
    if (!params) params = {};
    if (!params.method) params.method = 'POST';
    if (!params.controller) params.controller = resource.constructor.name.toLowerCase();
    var method = _method = params.method.toUpperCase();
    if (method != 'GET' && method != 'POST') {
        _method = method;
        method = 'POST';
    }

    ['remote', 'jsonp'].forEach(data_param.bind(params));

    buf.push('<form' + html_tag_params(params) + '>');
    if (resource.id) {
        buf.push(exports.input_tag({type: "hidden", name: "_method", value: "PUT" }));
    } else if (_method !== method) {
        buf.push(exports.input_tag({type: "hidden", name: "_method", value: _method }));
    }
    block({
        input: function (name, params) {
            params = params || {};
            if (params.value === undef) {
                params.value = resource[name] || '';
            }
            return exports.input_tag({
                name: name,
                id: name
            }, params);
        },
        checkbox: function (name) {
            return exports.input_tag({
                name: name,
                id: name,
                value: 1,
                checked: resource[name] ? 'checked' : undef,
                type: 'checkbox'
            });
        },
        label: function (name, caption) {
            return exports.label_tag(caption || humanize(name), {for: name});
        },
        submit: function (name, params) {
            return exports.input_tag({type: 'submit', value: name || 'Commit'}, params);
        },
        textarea: function (name, params) {
            return generic_tag('textarea', resource[name] || '', {name: name, id: name}, params);
        }
    });
    buf.push('</form>');
};

exports.input_tag = function (params, override) {
    return '<input' + html_tag_params(params, override) + ' />';
};

exports.label_tag = function (text, params) {
    return generic_tag('label', text, params);
};
