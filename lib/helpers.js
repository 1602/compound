/**
 * Module dependencies
 */
var path       = require('path'),
    fs         = require('fs'),
    crypto     = require('crypto');

/**
 * Import utilities
 */
var htmlTagParams = require('./railway_utils').html_tag_params,
    safe_merge = require('./railway_utils').safe_merge,
    humanize   = require('./railway_utils').humanize,
    undef;

/**
 * Config
 */
var regexps = {
  'cached': /^cache\//,
  'isHttp': /^https?:\/\/|\/\//
},
exts = {
  'css': '.css',
  'js' : '.js'
},
paths = {
  'css': '/stylesheets/',
  'js' : '/javascripts/'
};

/**
 * Publish HelperSet
 */
module.exports = new HelperSet(null);
module.exports.HelperSet = HelperSet;

/**
 * Set of helper methods
 */
function HelperSet(ctl) {
    var controller = ctl;
    this.controller = ctl;

    this.csrf_meta_tag = function () {
        return controller && controller.protectedFromForgery() ? [
            '<meta name="csrf-param" content="' + controller.request.csrfParam + '"/>',
            '<meta name="csrf-token" content="' + controller.request.csrfToken + '"/>'
        ].join('\n') : '';
    }

}


/**
 * Make helpers local to query
 * @returns Object containing all helpers
 */
module.exports.personalize = function (controller) {
    return new module.exports.HelperSet(controller);
};

/**
 * Return bunch of stylesheets link tags
 *
 * Examlple:
 *
 *     <link href="/stylesheets/all.css"  media="screen" rel="stylesheet" type="text/css" />
 *
 */
HelperSet.prototype.stylesheetLinkTag = function stylesheetLinkTag() {
    if (!paths.css || !paths.stylesheets) {
      paths.css = app.settings.cssDirectory || '/stylesheets/';
      paths.stylesheets = paths.css;
    }
  
    var args = Array.prototype.slice.call(arguments);
    var options = {media: 'screen', rel: 'stylesheet', type: 'text/css'};
    var links = [];
    if (typeof args[args.length - 1] == 'object') {
        options = safe_merge(options, args.pop());
    }
    mergeFiles('stylesheets', args).forEach(function (file) {
        delete options.href;
        // there should be an option to change the /stylesheets/ folder
        var href = checkFile('css', file);
        links.push(genericTagSelfclosing('link', options, { href: href }));
    });
    return links.join('\n    ');
};
HelperSet.prototype.stylesheet_link_tag = HelperSet.prototype.stylesheetLinkTag;

/**
 * Generates set of javascript includes composed from arguments
 * @param String script filename
 * @example
 *
 *     <%- javascript_include_tag('rails', 'application') %>
 *
 * generates
 *
 *     <script type="text/javascript" src="/javascripts/rails.js"></script>
 *     <script type="text/javascript" src="/javascripts/application.js"></script>
 */
HelperSet.prototype.javascriptIncludeTag = function javascriptIncludeTag() {
    if (!paths.js || !paths.javascripts) {
      paths.js = app.settings.jsDirectory || '/javascripts/'
      paths.javascripts = paths.js;
    }
    var args = Array.prototype.slice.call(arguments);
    var options = {type: 'text/javascript'};
    if (typeof args[args.length - 1] == 'object') {
        options = safe_merge(options, args.pop());
    }
    var scripts = [];
    mergeFiles('javascripts', args).forEach(function (file) {
        // there should be an option to change the /javascripts/ folder
        var href = checkFile('js', file);
        delete options.src;
        scripts.push(genericTag('script', '', options, {src: href}));
    });
    return scripts.join('\n    ');
};
HelperSet.prototype.javascript_include_tag = HelperSet.prototype.javascriptIncludeTag;

var merged = {
    stylesheets: {ext: exts.css},
    javascripts: {ext: exts.js}
};

/**
 * Merge files when caching enabled
 *
 * - app.set('merge javascripts')
 * - app.set('merge stylesheets')
 * TN: fixed https://github.com/1602/express-on-railway/issues/152
 */
function mergeFiles(scope, files) {
    // ensure that feature is enabled
    if (app.disabled('merge ' + scope)) {
        return files;
    }
    var ext  = merged[scope].ext,
      result = [],
      shasum = crypto.createHash('sha1'),
      minify = [],
      directory = merged[scope].directory = paths[scope].replace(/(\/+)/g, '');
    // only merge local files
    files.forEach(function (file) {
        if (!regexps.isHttp.test(file)) {
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
            var stream = fs.createWriteStream(path.join(app.root, 'public', directory, 'cache', digest + ext));
            var counter = 0;
            var fileContents = {};
            minify.forEach(function (file) {
                var filename = path.join(app.root, 'public', directory, file + ext);
                path.exists(filename, function (exists) {
                    if (exists) {
                        counter += 1;
                        
                        fs.readFile(filename, 'utf8', function (err, data) {
                            fileContents[file] = data;
                            done();
                        });
                    }
                })
            });
            function done () {
                if (--counter === 0) {
                    minify.forEach(function (file) {
                      data = fileContents[file];
                      stream.write('/* /' + directory + '/' + file + ext + ' */ \n');
                      stream.write(data + '\n');
                    });
                    
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

/**
 * Link helper
 *
 * @param {String} text
 * @param {String} url
 * @param {Object} params - set of html params (class, style, etc..)
 *
 *     <a href="url">text</a>
 */
HelperSet.prototype.linkTo = function linkTo(text, url, params) {
    ['remote', 'method', 'jsonp', 'confirm'].forEach(dataParam.bind(params));
    return genericTag('a', text, {href: url}, params);
};
HelperSet.prototype.link_to = HelperSet.prototype.linkTo;

/**
 * Form tag helper
 */
HelperSet.prototype.formTag = function (params, block) {
    var self = this;
    var buf = arguments.callee.caller.buf;

    // helper may be called with block only
    if (typeof params === 'function') {
        block = params;
        params = {};
    }

    if (typeof params === 'undefined') {
        params = {}
    }

    // default method is POST
    if (!params.method) {
        params.method = 'POST';
    }

    // hook up alternative methods (PUT, DELETE)
    var _method;
    var method = _method = params.method.toUpperCase();

    if (method != 'GET' && method != 'POST') {
        _method = method;
        params.method = 'POST';
    }

    // hook up data-params
    ['remote', 'jsonp', 'confirm'].forEach(dataParam.bind(params));

    // push output
    buf.push('<form' + htmlTagParams(params) + '>');
    buf.push( this.csrf_tag() );

    // alternative method?
    if (_method !== params.method) {
        buf.push(HelperSet.prototype.input_tag({type: "hidden", name: "_method", value: _method }));
    }
    if (typeof block === 'function') {
        block();
    }
    buf.push('</form>');
};
HelperSet.prototype.form_tag = HelperSet.prototype.formTag;

HelperSet.prototype.errorMessagesFor = function errorMessagesFor(resource) {
    var out = '';
    var h = this;

    if (resource.errors) {
        out += genericTag('div', printErrors(), {class: 'alert alert-error'});
    }

    return out;

    function printErrors() {
        var out = '<p>';
        out += genericTag('strong', 'Validation failed. Fix following errors before you continue:');
        out += '</p>';
        for (var prop in resource.errors) {
            if (resource.errors.hasOwnProperty(prop)) {
                out += '<ul>';
                resource.errors[prop].forEach(function (msg) {
                    out += genericTag('li', prop + ' ' + msg, {class: 'error-message'});
                });
                out += '</ul>';
            }
        }
        return out;
    }
};

/**
 * Form fields for resource helper
 */
HelperSet.prototype.fields_for = function (resource, block) {
    arguments.callee.buf = arguments.callee.caller.buf;
    resource = resource || {};
    var self = this;
    var resourceName = resource && resource.constructor && resource.constructor.modelName || false;
    var complexNames = (app.set('view options') || {}).complexNames;

    function makeName(name) {
        return complexNames && resourceName ? (resourceName + '[' + name + ']') : name;
    }

    function makeId(name) {
        return complexNames && resourceName ? (resourceName + '_' + name) : name;
    }

    block({
        input: function (name, params) {
            params = params || {};
            if (params.value === undef) {
                params.value = resource.hasOwnProperty(name) ? resource[name] : '';
            }
            return HelperSet.prototype.input_tag({
                name: makeName(name),
                id: makeId(name)
            }, params);
        },
        checkbox: function (name) {
            return HelperSet.prototype.input_tag({
                name: makeName(name),
                id: makeId(name),
                value: 1,
                checked: resource[name] ? 'checked' : undef,
                type: 'checkbox'
            });
        },
        file: function (name, params) {
            return HelperSet.prototype.input_tag({
                name: makeName(name),
                id: makeId(name),
                type: 'file'
            }, params);
        },
        label: function (name, caption, params) {
            return HelperSet.prototype.label_tag(
                caption || self.controller.t('models.' + resource.constructor.modelName + '.fields.' + name, humanize(name)),
                {for: makeId(name) },
                params);
        },
        submit: function (name, params) {
            return genericTag('button', name || 'Commit', {type: 'submit'}, params);
        },
        textarea: function (name, params) {
            return genericTag('textarea', sanitizeHTML(resource[name] || ''), {name: makeName(name), id: makeId(name)}, params);
        }
    });
};

/**
 * Form for resource helper
 *
 * @param {ModelInstance} resource
 * @param {Object} params
 * @param {Function} block
 */
HelperSet.prototype.formFor = function formFor(resource, params, block) {
    var self = this;
    var buf = arguments.callee.buf = arguments.callee.caller.buf;

    if (resource && resource.modelName) {
        if (typeof params !== 'object') {
            params = {};
        }
        if (!params.method) {
            params.method = 'PUT';
        }
        if (!params.action) {
            params.action = railway.routeMapper.pathTo[railway.utils.underscore(resource.modelName)](resource);
        }
    }

    this.form_tag(params, function () {
        arguments.callee.buf = buf;
        if (block) self.fields_for(resource, block);
    });
};
HelperSet.prototype.form_for = HelperSet.prototype.formFor;

/**
 * Input tag helper
 *
 *     <input type="text" ... />
 */
HelperSet.prototype.input_tag = function (params, override) {
    return '<input' + htmlTagParams(params, override) + ' />';
};

/**
 * Label tag helper
 *
 *     <label>text</label>
 */
HelperSet.prototype.label_tag = function (text, params, override) {
    return genericTag('label', text, params, override);
};

/**
 * Cross-site request forgery hidden inputs
 */
HelperSet.prototype.csrf_tag = function() {
    return '<input type="hidden" name="' + this.controller.request.csrfParam + '" value="' + this.controller.request.csrfToken + '" />';
}

HelperSet.prototype.sanitize = sanitizeHTML;

/**
 * Private util methods
 */

/**
 * Returns html code of one tag with contents
 *
 * @param String name - name of tag
 * @param String inner - inner html
 * @param Object params - set of tag attributes
 * @param Object override - set params to override params in previous arg
 */
function genericTag(name, inner, params, override) {
    return '<' + name + htmlTagParams(params, override) + '>' + inner + '</' + name + '>';
}

function genericTagSelfclosing(name, params, override) {
    return '<' + name + htmlTagParams(params, override) + ' />';
}

function dataParam(key) {
    if (this[key]) {
        this['data-' + key] = this[key];
        delete this[key];
    }
}

/**
 * Escape &, &lt; and > symbols
 */
function sanitizeHTML(html) {
    return html.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
}

function checkProd() {
  return app.settings.env === 'production';
}

function checkFile(type, file) {
  var isExternalFile = regexps.isHttp.test(file),
    isCached         = file.match(regexps.cached),
    href             = !isExternalFile ? paths[type] + file + exts[type] : file,
    isProd           = checkProd();
  if (!isCached && !isProd && !isExternalFile && !app.disabled('assets timestamps')) {
      href += '?' + Date.now()
  }
  return href;
}

