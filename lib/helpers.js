var utils = require('./railway_utils'),
    html_tag_params = utils.html_tag_params,
    safe_merge = utils.safe_merge,
    humanize   = utils.humanize,
    path       = require('path'),
    fs         = require('fs'),
    crypto     = require('crypto'),
    undef;

function generic_tag (name, inner, params, override) {
    return '<' + name + html_tag_params(params, override) + '>' + inner + '</' + name + '>';
}

function generic_sc_tag (name, params, override) {
    return '<' + name + html_tag_params(params, override) + ' />';
}

function data_param (key) {
    if (this[key]) {
        this['data-' + key] = this[key];
        delete this[key];
    }
}

function HelperSet (ctl) {
    var controller = ctl;
    this.controller = ctl;

    this.csrf_meta_tag = function () {
        return controller && controller.protectedFromForgery() ? [
            '<meta name="csrf-param" content="' + controller.request.csrfParam + '"/>',
            '<meta name="csrf-token" content="' + controller.request.csrfToken + '"/>'
        ].join('\n') : '';
    }
}

module.exports = new HelperSet(null);

/**
 * Make helpers local to query
 * @returns Object containing all helpers
 */
module.exports.personalize = function (controller) {
    return new HelperSet(controller);
};


// <link href="/stylesheets/all.css"  media="screen" rel="stylesheet" type="text/css" />
HelperSet.prototype.stylesheet_link_tag = function () {
    var args = Array.prototype.slice.call(arguments);
    var options = {media: 'screen', rel: 'stylesheet', type: 'text/css'};
    if (typeof args[args.length - 1] == 'object') {
        options = safe_merge(options, args.pop());
    }
    var links = [];
    mergeFiles('stylesheets', args).forEach(function (file) {
        delete options.href;
        var href = "/stylesheets/" + file + ".css";
        if (!file.match(/^cache\//) && app.settings.env !== 'production') {
            href += '?' + Date.now()
        }
        links.push(generic_sc_tag('link', options, {href: href}));
    });
    return links.join('\n    ');
};

/**
 * Generates set of javascript includes composed from arguments
 * @param String script filename
 * @example
 *
 *   <%- javascript_include_tag('rails', 'application') %>
 *
 * generates
 *
 *   <script type="text/javascript" src="/javascripts/rails.js"></script>
 *   <script type="text/javascript" src="/javascripts/application.js"></script>
 */
HelperSet.prototype.javascript_include_tag = function () {
    var args = Array.prototype.slice.call(arguments);
    var options = {type: 'text/javascript'};
    if (typeof args[args.length - 1] == 'object') {
        options = safe_merge(options, args.pop());
    }
    var scripts = [];
    mergeFiles('javascripts', args).forEach(function (file) {
        var localScript = !file.match(/^https?:\/\//);
        var href = localScript ? "/javascripts/" + file + ".js" : file;
        if (localScript && app.settings.env !== 'production' && !file.match(/^cache\//)) {
            href += '?' + Date.now();
        }
        delete options.src;
        scripts.push(generic_tag('script', '', options, {src: href}));
    });
    return scripts.join('\n    ');
};

var merged = {
    stylesheets: {ext: '.css'},
    javascripts: {ext: '.js'}
};

function mergeFiles (scope, files) {
    // ensure that feature is enabled
    if (app.disabled('merge ' + scope)) {
        return files;
    }
    var ext = merged[scope].ext;
    var result = [];
    var shasum = crypto.createHash('sha1');
    var minify = [];

    // only merge local files
    files.forEach(function (file) {
        if (file.search(/^https?:\/\//) === -1) {
            shasum.update(file);
            minify.push(file);
        } else {
            result.push(file);
        }
    });

    // calculate name of new script based on names of merged files
    var digest = shasum.digest('hex');

    // check cache state (undefined = not cached, false = cache in progress, String = cached)
    var cached = merged[scope][digest];
    if (cached) {
        // push resulted filename to result
        result.push(cached);
    } else {
        // we have no cache at the moment, just return files
        result = result.concat(minify);

        // if caching process is not started yet
        if (cached !== false) {
            // mark caching process as started
            merged[scope][digest] = false;
            // write resulted script as merged `minify` files
            var stream = fs.createWriteStream(path.join(app.root, 'public', scope, 'cache', digest + ext));
            var counter = 0;
            minify.forEach(function (file) {
                var filename = path.join(app.root, 'public', scope, file + ext);
                path.exists(filename, function (exists) {
                    if (exists) {
                        counter += 1;
                        fs.readFile(filename, 'utf8', function (err, data) {
                            stream.write(data + '\n');
                            done();
                        });
                    }
                })
            });
            function done () {
                if (--counter === 0) {
                    stream.end();
                }
            }
            // save name of resulted file to the merge scope registry
            stream.on('close', function () {
                merged[scope][digest] = ['cache', digest].join('/');
            })
        }
    }
    return result;
}

HelperSet.prototype.link_to = function (text, url, params) {
    ['remote', 'method', 'jsonp', 'confirm'].forEach(data_param.bind(params));
    return generic_tag('a', text, {href: url}, params);
};

HelperSet.prototype.form_for = function (resource, params, block) {
    var self = this;
    var buf = arguments.callee.caller.buf;
    var locals = arguments.callee.caller.arguments[0];
    if (!params) params = {};
    if (!params.method) params.method = 'POST';
    // if (!params.controller) params.controller = resource.constructor.name.toLowerCase();
    var method = _method = params.method.toUpperCase();
    if (method != 'GET' && method != 'POST') {
        _method = method;
        params.method = 'POST';
    }

    ['remote', 'jsonp', 'confirm'].forEach(data_param.bind(params));

    buf.push('<form' + html_tag_params(params) + '>');
    buf.push('<input type="hidden" name="' + locals.request.csrfParam + '" value="' + locals.request.csrfToken + '" />');
    if (_method !== params.method) {
        buf.push(HelperSet.prototype.input_tag({type: "hidden", name: "_method", value: _method }));
    }
    block({
        input: function (name, params) {
            params = params || {};
            if (params.value === undef) {
                params.value = resource[name] || '';
            }
            return HelperSet.prototype.input_tag({
                name: name,
                id: name
            }, params);
        },
        checkbox: function (name) {
            return HelperSet.prototype.input_tag({
                name: name,
                id: name,
                value: 1,
                checked: resource[name] ? 'checked' : undef,
                type: 'checkbox'
            });
        },
        label: function (name, caption) {
            return HelperSet.prototype.label_tag(caption || self.controller.t('models.' + resource.constructor.modelName + '.fields.' + name, humanize(name)), {for: name});
        },
        submit: function (name, params) {
            return HelperSet.prototype.input_tag({type: 'submit', value: name || 'Commit'}, params);
        },
        textarea: function (name, params) {
            return generic_tag('textarea', sanitizeHTML(resource[name] || ''), {name: name, id: name}, params);
        }
    });
    buf.push('</form>');
};

HelperSet.prototype.input_tag = function (params, override) {
    return '<input' + html_tag_params(params, override) + ' />';
};

HelperSet.prototype.label_tag = function (text, params) {
    return generic_tag('label', text, params);
};

function sanitizeHTML (html) {
    return html.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
}

HelperSet.prototype.sanitize = sanitizeHTML;

