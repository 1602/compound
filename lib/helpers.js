/**
 * Module dependencies
 */
var path       = require('path'),
    fs         = require('fs'),
    crypto     = require('crypto'),
    exists     = fs.exists || path.exists;

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
},
merged = {
    stylesheets: {ext: exts.css},
    javascripts: {ext: exts.js}
};

/**
 * Publish HelperSet
 */
module.exports = new HelperSet(null);
module.exports.HelperSet = HelperSet;

/**
 * Set of helper methods
 * 
 * @namespace
 * @param {Object} ctl Controller object
 */
function HelperSet(ctl) {
    var controller = ctl;
    this.controller = ctl;

    /**
     * CSRF Meta Tag generation
     *
     * @returns {String} Meta tags against CSRF-attacks
     */
    this.csrf_meta_tag = function () {
        return controller && controller.protectedFromForgery() ? [
            '<meta name="csrf-param" content="' + controller.request.csrfParam + '"/>',
            '<meta name="csrf-token" content="' + controller.request.csrfToken + '"/>'
        ].join('\n') : '';
    }

}


/**
 * Make helpers local to query
 *
 * @param {Object} controller Controller Object
 * @returns {Object} containing all helpers
 */
module.exports.personalize = function (controller) {
    return new module.exports.HelperSet(controller);
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
 * @param {String} stylesheet filename
 * @returns {String} HTML code to the stylesheets in the parameters
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
 * @param {String} script filename
 * @returns {String} the generated &lt;script&gt; tags
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

/**
 * Merge files when caching enabled
 *
 * You can enable merging manually with the following configuration:
 *
 *     app.set('merge javascripts')
 *     app.set('merge stylesheets')
 *
 * @param {String} scope Scope which is merged, e.g. javascripts or stylesheets
 * @param {Array} files Array of files which should be merged
 * @see https://github.com/1602/express-on-railway/issues/152
 * @returns {String} Pathname to the merged file
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
            var stream = fs.createWriteStream(path.join(app.root, 'public', directory, 'cache_' + digest + ext));
            var counter = 0;
            var fileContents = {};
            minify.forEach(function (file) {
                var filename = path.join(app.root, 'public', directory, file + ext);
                exists(filename, function (exists) {
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
                merged[scope][digest] = ['cache', digest].join('_');
            })
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
 * @param {String} text Text of the link
 * @param {String} url Url where the link points to
 * @param {Object} params Set of html params (class, style, etc..)
 * @returns {String} Generated html for link
 */
HelperSet.prototype.linkTo = function linkTo(text, url, params) {
    ['remote', 'method', 'jsonp', 'confirm'].forEach(dataParam.bind(params));
    return genericTag('a', text, {href: url}, params);
};
HelperSet.prototype.link_to = HelperSet.prototype.linkTo;

/**
 * Form tag helper
 *
 * @methodOf HelperSet.prototype
 * @param {Object} params
 * @param {Function} block
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
    
    // function?
    if (typeof block === 'function') {
        block();
    }
    buf.push('</form>');
};
HelperSet.prototype.form_tag = HelperSet.prototype.formTag;

/**
 * Prints error messages for the model instance
 *
 * @methodOf HelperSet.prototype
 * @param {ModelInstance} resource
 * @returns {String} Error messages from the model instance
 */
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
 *
 * @methodOf HelperSet.prototype
 * @param {ModelInstance} resource
 * @param {Function} block
 * @namespace
 */
HelperSet.prototype.fields_for = function (resource, block) {
    arguments.callee.buf = arguments.callee.caller.buf;
    resource = resource || {};
    var self = this;
    var resourceName = resource && resource.constructor && resource.constructor.modelName || false;
    var complexNames = (app.set('view options') || {}).complexNames;

    /**
     * Generates a name
     *
     * @requires resourceName
     * @param {String} name Name of the element
     * @returns {String} returns the generated name
     */
    function makeName(name) {
        return complexNames && resourceName ? (resourceName + '[' + name + ']') : name;
    }

    /**
     * Generates an id field
     *
     * @requires resourceName
     * @param {String} name Name of the element
     * @returns {String} returns the generated id name
     */
    function makeId(name) {
        return complexNames && resourceName ? (resourceName + '_' + name) : name;
    }
    
    block({
        /**
         * Input tag helper
         *
         * Example in ejs:
         *
         *      <%- form.input("test") %>
         *
         * This returns:
         *
         *      <input name="test"/>
         *
         * @param {String} name Name of the element
         * @param {Object} params Additional parameters
         */
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
        checkbox: function (name, params) {
            params = params || {};
            if (params.value === undef) {
                params.value = resource[name] || 1;
            }
            if (params.checked === undef) {
                if(resource[name]) {
                    params.checked = 'checked';
                }
            } else if (params.checked === false) {
                delete params.checked;
            }
            return HelperSet.prototype.input_tag({
                name: makeName(name),
                id: makeId(name),
                type: 'checkbox'
            }, params);
        },
        file: function (name, params) {
            return HelperSet.prototype.input_tag({
                name: makeName(name),
                id: makeId(name),
                type: 'file'
            }, params);
        },
        /*
         * Label helper
         *
         * Example in ejs:
         *
         *      <%- form.label("test", false, {class: "control-label"}) %>
         *
         * This returns:
         *
         *      <label for="test" class="control-label">Test</label>
         *
         * @param {String} name Name of the element
         * @param {String} caption Optional different caption of the elemt
         * @param {Object} params Additional parameters
         */
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
        },
        /*
         * Provides a select tag
         *
         * In ejs:
         *
         *      <%- form.select("state", states, {fieldname: 'name', fieldvalue: '_id'}) %>
         *
         * Possible params:
         * * blank: {STRING} Blank value to be added at the beginning of the list
         * * fieldname: {STRING} Sets the name of the field in "options" field where the displayed values can be found. Default: "value"
         * * fieldvalue: {STRING} Sets the name of the field in "options" field where the submitted values can be found. Default = fieldname
         * * multiple: Can be set to false if size >1 to only select one value.
         * * select: Select a value. If fieldname and fieldvalue are different, the value is compared with fieldvalue otherwise with fieldname.
         * * size: Sets the displayed size of the select field
         *
         * @author [Uli Wolf](https://github.com/SirUli)
         * @param {String} name Name of the select tag
         * @param {Object} options Array of possible options
         * @param {Object} params Additional parameters
         */
        select: function (name, options, params) {
            var options = options || '';
            var params = params || {};
            
            // optional: Holds the displayed fieldname where the data can be found in 'options'
            var optionFieldname = params.fieldname || 'value';
            delete params.fieldname;

            // optional: Holds the submittable fieldvalue where the data can be found in 'options'
            var optionFieldvalue = params.fieldvalue || optionFieldname;
            delete params.fieldvalue;

            // optional: Holds the number of entries that can be seen at once
            // If size > 1, multiple values can be selected (can be switched off via multiple:false)
            // If size = 1, only one value is selectable (Drop-Down)
            if (params.size === undef) {
                params.size = 1;
            } else {
                if (params.size > 1) {
                    if (params.multiple === undef || params.multiple === true) {
                        params.multiple = 'multiple';
                    } else {
                        delete params.multiple;
                    }
                }
            }

            // optional: Preselect an entry
            if (params.select === undef) {
                params.select = resource[name] || '';
            }
            var optionSelected = params.select;
            delete params.select;

            // Render the options
            var innerOptions = '';

            // optional: Add a blank field at the beginning
            if (params.blank !== undef) {
                innerOptions += HelperSet.prototype.option_tag(sanitizeHTML(params.blank), {value: ''})
            }

            for (var optionsNr in options) {
                var option = options[optionsNr];
                var optionParameters = new Array();
                
                // Is the value in a seperate field?
                if (option[optionFieldvalue] != option[optionFieldname]) {
                    optionParameters.value = option[optionFieldvalue];
                }
                
                if(activeValue(option[optionFieldvalue], optionSelected)) {
                    optionParameters.selected = 'selected';
                }
                
                // Generate the option Tags
                innerOptions += HelperSet.prototype.option_tag(sanitizeHTML(option[optionFieldname]), optionParameters)
            }
            // Render the select
            return HelperSet.prototype.select_tag(innerOptions, {name: makeName(name), id: makeId(name)}, params);
        }
    });
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
 * @methodOf HelperSet.prototype
 * @param {String} text - inner html
 * @param {Object} params - set of tag attributes
 * @param {Object} override - set params to override params in previous arg 
 * @returns {String} Finalized input tag
 */
HelperSet.prototype.input_tag = function (params, override) {
    return '<input' + htmlTagParams(params, override) + ' />';
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
HelperSet.prototype.label_tag = function (text, params, override) {
    return genericTag('label', text, params, override);
};

/**
 * Cross-site request forgery hidden inputs
 *
 * @methodOf HelperSet.prototype
 * @returns {String} CSRF-Tag with parameters
 */
HelperSet.prototype.csrf_tag = function() {
    return '<input type="hidden" name="' + this.controller.request.csrfParam + '" value="' + this.controller.request.csrfToken + '" />';
}

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
HelperSet.prototype.select_tag = function (innerOptions, params, override) {
    return genericTag('select', innerOptions, params, override);
};

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
HelperSet.prototype.option_tag = function (text, params, override) {
    return genericTag('option', text, params, override);
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
    return '<' + name + htmlTagParams(params, override) + '>' + inner + '</' + name + '>';
}

/**
 * Returns html code of a selfclosing tag
 *
 * @param {String} name name of tag
 * @param {Object} params set of tag attributes
 * @param {Object} override set params to override params in previous arg
 * @returns {String} Finalized generic selfclosing tag
 */
function genericTagSelfclosing(name, params, override) {
    return '<' + name + htmlTagParams(params, override) + ' />';
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
 * Compares a string against a string or an array
 *
 * @author [Uli Wolf](https://github.com/SirUli)
 * @param {String} value Content of the String to be compared
 * @param {String|Array} selectvalue String or Array of possiblities to be equal to the first string
 * @returns {Boolean} True if the string matches the other string or array. False when not.
 */
function activeValue(value, selectvalue) {
    var returnBool = false;
    
    // If this is an Array (e.g. when multiple values should be selected), iterate
    if (Object.prototype.toString.call(selectvalue) === '[object Array]') {
        // This is an Array (e.g. when multiple values should be selected), iterate
        for (var selectvalueNr in selectvalue) {
            // Cast to String as these might be objects.
            if (String(value) == String(selectvalue[selectvalueNr])) {
                returnBool = true
                continue;
            }
        }
    } else {
        // This is just one entry
        // Cast to String as these might be objects.
        if (String(value) == String(selectvalue)) {
            returnBool = true
        }
    }
    return returnBool;
}

/**
 * Escape &, < and > symbols
 * 
 * @param {String} html String with possible HTML-Elements
 * @returns {String} resulting string with escaped characters
 */
function sanitizeHTML(html) {
    return html.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
}
HelperSet.prototype.sanitize = sanitizeHTML;

/**
 * Checks if the environment is production
 * 
 * @returns {Boolean} True if production, otherwise false
 */
function checkProd() {
  return app.settings.env === 'production';
}

/**
 * Provides the link to a file. Checks if a file needs to be suffixed with a timestamp
 * 
 * @param {String} type Type of the file, e.g. css or js
 * @param {String} file name (local file) or link (external) to the file
 * @returns {String} Final Link to the file
 */
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

