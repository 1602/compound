/**
 * Module dependencies
 */
var path = require('path'),
    fs = require('fs'),
    exists = fs.exists || path.exists,
    crypto = require('crypto'),
    utils = require('./utils'),
    FormForResource = require('./form-for-resource.js'),
    _url = require('url');

/**
 * Import utilities
 */
var htmlTagParams = utils.html_tag_params,
    safe_merge = utils.safe_merge,
    humanize = utils.humanize,
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
},
merged = {
    stylesheets: {ext: exts.css},
    javascripts: {ext: exts.js}
},
globalContents = {};

/**
 * Publish HelperSet
 */
module.exports = new HelperSet(null);
module.exports.HelperSet = HelperSet;

/**
 * Set of helper methods
 *
 * @namespace
 * @param {Object} ctl Controller object.
 */
function HelperSet(ctl) {
    var helpers = this;
    this.controller = ctl;
    this._contents = ctl ? new ContentsBuffer() : globalContents;
    this.htmlEscape = true;
    if (ctl) {
        this.controllerName = ctl.controllerName;
        this.actionName = ctl.actionName;
        this.pathTo = this.path_to = ctl.pathTo;
        this.t = ctl.t.bind(ctl);
        this.t.locale = ctl._t && ctl._t.locale;
        this.htmlEscape = ctl && ctl.compound.app && ctl.compound.app.enabled('escape html');
    }

    /**
     * CSRF Meta Tag generation
     *
     * @return {String} Meta tags against CSRF-attacks
     */
    this.csrfMetaTag = this.csrf_meta_tag = function() {
        return ctl && ctl.protectedFromForgery() ? [
            helpers.metaTag('csrf-param', ctl.req.csrfParam),
            helpers.metaTag('csrf-token', ctl.req.csrfToken)
        ].join('\n') : '';
    };

    // for templating engines losing context
    Object.keys(HelperSet.prototype).forEach(function(name) {
        helpers[name] = HelperSet.prototype[name].bind(helpers);
    });
}

function ContentsBuffer() {
    var buf = this;
    Object.keys(globalContents).forEach(function(key) {
        buf[key] = [];
        globalContents[key].forEach(function (val) {
            buf[key].push(val);
        });
    });
}


/**
 * Make helpers local to query
 *
 * @param {Object} controller Controller Object.
 * @return {Object} containing all helpers
 */
module.exports.personalize = function(controller) {
    return new module.exports.HelperSet(controller);
};

HelperSet.prototype.metaTag = function (name, content, params) {
    var undef;
    params = params || {};
    if (content && typeof content === 'object') {
        params = content;
        content = undef || params.content;
    }
    if (name && typeof name === 'object') {
        params = name;
        name = undef || params.name;
        content = undef || params.content;
    }
    return genericTagSelfclosing('meta', {name: name, content: content}, params);
};

/**
 * Return bunch of stylesheets link tags
 *
 * Example in ejs:
 *
 *      <%- stylesheet_link_tag('bootstrap', 'style') %>
 *
 * This returns:
 *
 *      <link media="screen" rel="stylesheet" type="text/css" href="/stylesheets/bootstrap.css" />
 *      <link media="screen" rel="stylesheet" type="text/css" href="/stylesheets/style.css" />
 *
 * @param {String} stylesheet filename.
 * @return {String} HTML code to the stylesheets in the parameters
 */
HelperSet.prototype.stylesheetLinkTag = function stylesheetLinkTag() {
    var args;
    var app = this.controller ? this.controller.app : null;
    if (!paths.css || !paths.stylesheets) {
      paths.css = app && this.controller.app.settings.cssDirectory || '/stylesheets/';
      paths.stylesheets = paths.css;
    }

    if (arguments[0] instanceof Array) {
        args = arguments[0];
    } else {
        args = Array.prototype.slice.call(arguments);
    }
    var options = {media: 'screen', rel: 'stylesheet', type: 'text/css'};
    var links = [];
    if (typeof args[args.length - 1] == 'object') {
        options = safe_merge(options, args.pop());
    }
    mergeFiles(app, 'stylesheets', args).forEach(function(file) {
        delete options.href;
        // there should be an option to change the /stylesheets/ folder
        var href = checkFile(app, 'css', file);
        links.push(genericTagSelfclosing('link', options, { href: href }));
    });
    return links.join('\n    ');
};
HelperSet.prototype.stylesheet_link_tag = HelperSet.prototype.stylesheetLinkTag;

/**
 * Generates set of javascript includes composed from arguments
 *
 * Example in ejs:
 *
 *     <%- javascript_include_tag('rails', 'application') %>
 *
 * This returns:
 *
 *     <script type="text/javascript" src="/javascripts/rails.js"></script>
 *     <script type="text/javascript" src="/javascripts/application.js"></script>
 *
 * @param {String} script filename.
 * @return {String} the generated &lt;script&gt; tags
 */
HelperSet.prototype.javascriptIncludeTag = function javascriptIncludeTag() {
    var helpers = this;
    var args;
    var app = this.controller ? this.controller.app : null;
    if (!paths.js || !paths.javascripts) {
      paths.js = app && this.controller.app.settings.jsDirectory || '/javascripts/';
      paths.javascripts = paths.js;
    }
    if (arguments[0] instanceof Array) {
        args = arguments[0];
    } else {
        args = Array.prototype.slice.call(arguments);
    }
    var options = {type: 'text/javascript'};
    if (typeof args[args.length - 1] == 'object') {
        options = safe_merge(options, args.pop());
    }
    var scripts = [];
    mergeFiles(app, 'javascripts', args).forEach(function(file) {
        // there should be an option to change the /javascripts/ folder
        var href = checkFile(app, 'js', file);
        delete options.src;
        scripts.push(helpers.tag('script', '', options, {src: href}));
    });
    return scripts.join('\n    ');
};
HelperSet.prototype.javascript_include_tag = HelperSet.prototype.javascriptIncludeTag;

/**
 * Merge files when caching enabled
 *
 * You can enable merging manually with the following configuration:
 *
 *     app.set('merge javascripts')
 *     app.set('merge stylesheets')
 *
 * @param {String} scope Scope which is merged, e.g. javascripts or stylesheets.
 * @param {Array} files Array of files which should be merged.
 * @see https://github.com/1602/express-on-railway/issues/152
 * @return {String} Pathname to the merged file
 */
function mergeFiles(app, scope, files) {
    // ensure that feature is enabled
    if (!app || app.disabled('merge ' + scope)) {
        return files;
    }
    var ext = merged[scope].ext,
      result = [],
      shasum = crypto.createHash('sha1'),
      minify = [],
      directory = merged[scope].directory = paths[scope].replace(/^\/|\/$/g, '');
    // only merge local files
    files.forEach(function(file) {
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
    var root = app.get(ext.substr(1) + ' app root') || app.root;
    if (cached || !fs.createWriteStream) {
        // push resulted filename to result
        result.push('cache_' + digest);
    } else if (fs.existsSync(path.join(root, 'public', directory))) {
        // if caching process is not started yet
        if (!fs.existsSync(path.join(root, 'public', directory, 'cache_' + digest + ext))) {
            // write resulted script as merged `minify` files
            var stream = fs.createWriteStream(path.join(root, 'public', directory, 'cache_' + digest + ext));
            var counter = 0;
            var fileContents = {};
            minify.forEach(function(file) {
                var filename = path.join(root, 'public', directory, file + ext);
                exists(filename, function(exists) {
                    if (exists) {
                        counter += 1;

                        fs.readFile(filename, 'utf8', function(err, data) {
                            fileContents[file] = data;
                            done();
                        });
                    }
                });
            });
            function done() {
                if (--counter === 0) {
                    minify.forEach(function(file) {
                      data = fileContents[file];
                      stream.write('/* /' + directory + '/' + file + ext + ' */ \n');
                      stream.write(data + '\n');
                    });

                    stream.end();
                }
            }
            // save name of resulted file to the merge scope registry
            stream.on('close', function() {
                merged[scope][digest] = ['cache', digest].join('_');
            });

            result.push(['cache', digest].join('_'));
        } else {
            merged[scope][digest] = ['cache', digest].join('_');
        }
    }
    return result;
}

/**
 * Link helper
 *
 * Example in ejs:
 *
 *      <%- link_to("Home", '/') %>
 *
 * This returns:
 *
 *      <a href="/">Home</a>
 *
 * @param {String} text Text of the link.
 * @param {String} url Url where the link points to.
 * @param {Object} params Set of html params (class, style, etc..).
 * @return {String} Generated html for link
 */
HelperSet.prototype.linkTo = function linkTo(text, url, params) {
    ['remote', 'method', 'jsonp', 'confirm'].forEach(dataParam.bind(params));
    return this.tag('a', text, {href: url}, params);
};
HelperSet.prototype.link_to = HelperSet.prototype.linkTo;

HelperSet.prototype.linkToRemote = function linkToRemote(text, url, params) {
    params = params || {};
    params.remote = true;
    return this.linkTo(text, url, params);
};

/**
 * Link helper if not in the current url
 *
 * @param {String} text
 * @param {String} url
 * @param {Object} params - set of html params (class, style, etc..)
 *
 *     <a href="url">text</a>
 */
HelperSet.prototype.linkToIfNotCurrent = function linkTo(text, url, params) {
    if (url && url[0]=='/') url = url.substring(1);  //trim first '/' if exists
    return (url.toLowerCase() == _url.parse( this.controller.request.url ).pathname.substring(1).toLowerCase() ) ? text : HelperSet.prototype.link_to(text, url, params) ;
};
HelperSet.prototype.link_to_if_not_current = HelperSet.prototype.linkToIfNotCurrent;

/**
 * Form tag helper
 *
 * @methodOf HelperSet.prototype
 * @param {Object} params
 * @param {Function} block
 */
HelperSet.prototype.formTag = function(params, block) {
    throw new Error('Helpers formTag and formFor(with block) are deprecated, use',
        'block-less version of formFor helper, or formTagBegin and formTagEnd tags');
};
HelperSet.prototype.form_tag = HelperSet.prototype.formTag;

HelperSet.prototype.formTagRemote = function(params) {
    params = params || {};
    params.remote = true;
    return this.formTag(params);
};

/**
 * Prints error messages for the model instance
 *
 * @methodOf HelperSet.prototype
 * @param {ModelInstance} resource
 * @param {Object} params Custom message params
 * @returns {String} Error messages from the model instance
 */
HelperSet.prototype.errorMessagesFor = function errorMessagesFor(resource, params) {
    var out = '';
    var h = this;
    params = params || {};

    if (resource.errors) {
        var cls = (params.class) ? params.class : 'alert alert-error';
        out += this.tag('div', this.html(printErrors()), {class: cls});
    }

    return out;

    function printErrors() {
        var msg = (params.message) ? params.message : 'Validation failed. Fix the following errors to continue:';
        var out = '<p>';
        out += h.tag('strong', msg);
        out += '</p>';
        for (var prop in resource.errors) {
            if (resource.errors.hasOwnProperty(prop)) {
                out += '<ul>';
                resource.errors[prop].forEach(function (msg) {
                    out += h.tag('li', utils.camelize(prop, true) + ' ' + msg, {class: 'error-message'});
                });
                out += '</ul>';
            }
        }
        return out;
    }
};

/**
 * Form fields for resource helper
 *
 * @methodOf HelperSet.prototype
 * @param {ModelInstance} resource
 * @param {Function} block
 * @namespace
 */
HelperSet.prototype.fieldsFor = function (resource, formParams) {
    return new FormForResource(resource || {}, formParams, null, this);
};



/**
 * Form for resource helper
 *
 * @methodOf HelperSet.prototype
 * @param {ModelInstance} resource
 * @param {Object} params
 * @param {Function} block
 */
HelperSet.prototype.formFor = function formFor(resource, params, block) {
    var self = this;

    if (resource && resource.constructor && resource.constructor.modelName) {
        if (typeof params !== 'object') {
            params = {};
        }
        if (!params.method) {
            params.method = resource && resource.id ? 'PUT' : 'POST';
        }
        if (!params.action) {
            params.action = this.controller.app.compound.map.pathTo[utils.underscore(resource.constructor.modelName)](resource);
        }
    }

    /**
     * If we don't have a block we don't want any output per default
     */
    if (block) {
      this.formTag(params, function () {
          if (block) self.fieldsFor(resource, params, block);
      });
    } else {
      // No block function given, just return our field creator hash
      return self.fieldsFor(resource, params);
    }
};
HelperSet.prototype.form_for = HelperSet.prototype.formFor;

HelperSet.prototype.formForRemote = function(resource, params) {
    params = params || {};
    params.remote = true;
    return this.formFor(resource, params);
};

/**
 * Form tag begin helper
 *
 * @methodOf HelperSet.prototype
 * @param {Object} params - set of tag attributes
 * @returns {String} Form tag with csrfTag as well as method tag
 */
HelperSet.prototype.formTagBegin = function (params) {
  // default method is POST
  if (!params.method) {
      params.method = 'POST';
  }

  // hook up alternative methods (PUT, DELETE)
  var method = params.method.toUpperCase();
  var _method = method;

  if (method != 'GET' && method != 'POST') {
      _method = method;
      params.method = 'POST';
  }

  // hook up data-params
  ['remote', 'jsonp', 'confirm'].forEach(dataParam.bind(params));

  // push output
  var html = '<form' + htmlTagParams(params) + '>';
  html += this.csrfTag();

  // alternative method
  if(_method !== params.method) {
    html += HelperSet.prototype.inputTag({type: "hidden", name: "_method", value: _method });
  }
  return html;
};

HelperSet.prototype.formTagRemoteBegin = function(params) {
    params = params || {};
    params.remote = true;
    return this.formTagBegin(params);
};

/**
 * Form tag end helper
 *
 * @methodOf HelperSet.prototype
 * @returns {String} Closing tag for form
 */
HelperSet.prototype.formTagEnd = function (params) {
  return '</form>';
};

/**
 * Input tag helper
 *
 * @methodOf HelperSet.prototype
 * @param {String} text - inner html.
 * @param {Object} params - set of tag attributes.
 * @param {Object} override - set params to override params in previous arg.
 * @returns {String} Finalized input tag
 */
HelperSet.prototype.inputTag = function (params, override) {
    return '<input' + htmlTagParams(params, override) + ' />';
};
HelperSet.prototype.input_tag = HelperSet.prototype.inputTag;

/**
 * Textarea tag helper
 *
 * @methodOf HelperSet.prototype
 * @param {String} text - inner html.
 * @param {Object} params - set of tag attributes.
 * @param {Object} override - set params to override params in previous arg.
 * @returns {String} Finalized input tag
 */
HelperSet.prototype.textareaTag = function (value, params, override) {
    if (typeof value === 'object') {
        params = value;
        override = params;
        value = params.value;
    }
    return this.tag('textarea', value || '', params, override);
};

/**
 * Label tag helper
 *
 * Result:
 *
 *     <label>text</label>
 *
 * @methodOf HelperSet.prototype
 * @param {String} text - inner html
 * @param {Object} params - set of tag attributes
 * @param {Object} override - set params to override params in previous arg 
 * @returns {String} Finalized label tag
 */
HelperSet.prototype.labelTag = function (text, params, override) {
    return this.tag('label', text, params, override);
};
HelperSet.prototype.label_tag = HelperSet.prototype.labelTag;

/**
 * Submit tag helper
 *
 * Result:
 *
 *     <button class="btn">Text</button>
 *
 * @param {String} text - value (text on button).
 * @param {Object} params - set of tag attributes.
 * @returns {String} Finalized input tag.
 */
HelperSet.prototype.submitTag = function (text, params) {
    return this.inputTag({value: text, type: 'submit'}, params);
};

/**
 * Button tag helper
 *
 * Usage (ejs):
 *
 *     <%- buttonTag('Text', {class: 'btn'}) %>
 *
 * Result:
 *
 *     <button class="btn">Text</button>
 *
 * @param {String} text - value (text on button).
 * @param {Object} params - set of tag attributes.
 * @returns {String} Finalized input tag.
 */
HelperSet.prototype.buttonTag = function (text, params) {
    return this.tag('button', text, params);
};

/**
 * Cross-site request forgery hidden inputs
 *
 * @methodOf HelperSet.prototype
 * @returns {String} CSRF-Tag with parameters
 */
HelperSet.prototype.csrfTag = function () {
    return '<input type="hidden" name="' + this.controller.req.csrfParam + '" value="' + this.controller.req.csrfToken + '" />';
};
HelperSet.prototype.csrf_tag = HelperSet.prototype.csrfTag;

/**
 * Select tag helper
 *
 * Result:
 *
 *     <select>innerOptions</select>
 *
 * @methodOf HelperSet.prototype
 * @author [Uli Wolf](https://github.com/SirUli)
 * @param {String} innerOptions Inner html of the select tag
 * @param {Object} params Set of tag attributes
 * @param {Object} override Set params to override params in previous arg 
 * @returns {String} Finalized select tag
 */
HelperSet.prototype.selectTag = function (innerOptions, params, override) {
    return this.tag('select', html(innerOptions), params, override);
};
HelperSet.prototype.select_tag = HelperSet.prototype.selectTag;

/**
 * Option tag helper
 *
 * Result:
 *
 *     <option>text</option>
 * 
 * @methodOf HelperSet.prototype
 * @author [Uli Wolf](https://github.com/SirUli)
 * @param {String} text Inner html
 * @param {Object} params Set of tag attributes
 * @param {Object} override Set params to override params in previous arg 
 * @returns {String} Finalized option tag
 */
HelperSet.prototype.optionTag = function (text, params, override) {
    return this.tag('option', text, params, override);
};
HelperSet.prototype.option_tag = HelperSet.prototype.optionTag;

/**
 * This helper returns method which calculates matching his single argument with
 * pattern and returns second arg
 * in case if result true, otherwise it returns third argument
 *
 * Example:
 *
 *     var item = matcher(pageName, '<li class="active">', '<li>');
 *     item('home') + 'Home</li>'
 *     item('about-us') + 'About us</li>'
 */
HelperSet.prototype.matcher = function (pattern, positive, negative) {
    negative = negative || '';
    return function (value) {
        return value === pattern ? positive : negative;
    };
};

HelperSet.prototype.icon = function (type, params) {
    return this.tag('i', '', {class: 'icon-' + type}, params) + ' ';
};

HelperSet.prototype.imageTag = function (src, params) {
    return genericTagSelfclosing('img', {src: src}, params);
};

/**
 * Anchor tag
 *
 * Example:
 *
 *     <%- anchor('some-thing') %>
 *     <a name="some-thing"></a>
 */
HelperSet.prototype.anchor = function anchor(name, params) {
    params = params || {};
    params.name = name;
    return this.linkTo('', '', params);
};

/**
 * Content for named section.
 *
 * Called with one param acts as getter and returns all content pieces,
 * collected before. Called with two params accumulates second param in named
 * collection.
 *
 * Examples:
 *
 * In layout:
 *
 *     <%- contentFor('javascripts') %>
 *
 * In view:
 *
 *     <% contentFor('javascripts', javascriptIncludeTag('view-specific')) %>
 *
 * This will add some view-specific content to layout.
 * This method also could be called from controller.
 */
HelperSet.prototype.contentFor = function contentFor(name, content) {
    if (content) {
        this._contents[name] = this._contents[name] || [];
        this._contents[name].push(content);
    } else {
        return (this._contents[name] || []).join('');
    }
};


/**
 * Private util methods
 */

/**
 * Returns html code of one tag with contents
 *
 * @param {String} name name of tag
 * @param {String} inner inner html
 * @param {Object} params set of tag attributes
 * @param {Object} override set params to override params in previous arg
 * @returns {String} Finalized generic tag
 */
function genericTag(name, inner, params, override) {
    return html('<' + name + htmlTagParams(params, override) + '>' + this.text(inner) + '</' + name + '>');
}
HelperSet.prototype.tag = genericTag;

function html(res) {
    res = new String(res);
    res.toHtmlString = function() {
        return this;
    };
    return res;
}
HelperSet.prototype.html = html;

/**
 * Returns html code of a selfclosing tag
 *
 * @param {String} name name of tag
 * @param {Object} params set of tag attributes
 * @param {Object} override set params to override params in previous arg
 * @returns {String} Finalized generic selfclosing tag
 */
function genericTagSelfclosing(name, params, override) {
    return html('<' + name + htmlTagParams(params, override) + ' />');
}


/**
 * Prefixes key with 'data-'
 *
 * @param {String} key name of key
 */
function dataParam(key) {
    if (this[key]) {
        this['data-' + key] = this[key];
        delete this[key];
    }
}

/**
 * Escape &, < and > symbols
 * 
 * @param {String} html String with possible HTML-Elements
 * @returns {String} resulting string with escaped characters
 */
function sanitizeHTML(text) {
    if (!this.htmlEscape) return text;
    if (typeof text === 'object') {
        if (text instanceof String && text.toHtmlString) {
            return text.toHtmlString();
        }
        text = JSON.stringify(text, null, '   ');
    }
    return text.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
}
HelperSet.prototype.sanitize = sanitizeHTML;
HelperSet.prototype.text = sanitizeHTML;

/**
 * Provides the link to a file. Checks if a file needs to be suffixed with a timestamp
 * 
 * @param {String} type Type of the file, e.g. css or js
 * @param {String} file name (local file) or link (external) to the file
 * @returns {String} Final Link to the file
 */
function checkFile(app, type, file) {
    var isExternalFile = regexps.isHttp.test(file),
    isCached         = file.match(regexps.cached),
    href             = !isExternalFile ? paths[type] + file + exts[type] : file;
    var appprefix;
    if (!app) {
        appprefix = '';
    } else if (app.path) {
        appprefix = app.path();
    } else {
        appprefix = app.set('basepath') || '';
    }
    return isExternalFile ? href : appprefix + href;
}

