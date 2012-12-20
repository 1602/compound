var undef, sys = require('util'),
    path = require('path'),
    fs = require('fs'),
    Module = require('module'),
    vm = require('vm'),
    yaml = require('yaml-js');

exports.html_tag_params = function(params, override) {
    var maybe_params = '';
    safe_merge(params, override);
    for (var key in params) {
        if (params[key] != undef) {
            maybe_params += ' ' + key + '="' + params[key].toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
        }
    }
    return maybe_params;
};

var safe_merge = exports.safe_merge = function(merge_what) {
    merge_what = merge_what || {};
    Array.prototype.slice.call(arguments).forEach(function(merge_with, i) {
        if (i == 0) return;
        for (var key in merge_with) {
            if (!merge_with.hasOwnProperty(key) || key in merge_what) continue;
            merge_what[key] = merge_with[key];
        }
    });
    return merge_what;
};

exports.humanize = function(underscored) {
    var res = underscored.replace(/_/g, ' ');
    return res[0].toUpperCase() + res.substr(1);
};

exports.camelize = function(underscored, upcaseFirstLetter) {
    var res = '';
    underscored.split('_').forEach(function(part) {
        res += part[0].toUpperCase() + part.substr(1);
    });
    return upcaseFirstLetter ? res : res[0].toLowerCase() + res.substr(1);
};

exports.classify = function(str) {
    return exports.camelize(exports.singularize(str));
};

exports.underscore = function(camelCaseStr) {
    var initialUnderscore = camelCaseStr.match(/^_/) ? '_' : '';
    var str = camelCaseStr
        .replace(/^_([A-Z])/g, '$1')
        .replace(/([A-Z])/g, '_$1')
        .replace(/^_/, initialUnderscore);
    return str.toLowerCase();
};

exports.singularize = require('../vendor/inflection.js').singularize;
exports.pluralize = require('../vendor/inflection.js').pluralize;

// Stylize a string
function stylize(str, style) {
    var styles = {
        'bold' : [1, 22],
        'italic' : [3, 23],
        'underline' : [4, 24],
        'cyan' : [96, 39],
        'blue' : [34, 39],
        'yellow' : [33, 39],
        'green' : [32, 39],
        'red' : [31, 39],
        'grey' : [90, 39],
        'green-hi' : [92, 32]
    };
    var s = styles[style];
    return '\033[' + s[0] + 'm' + str + '\033[' + s[1] + 'm';
}

var $ = function(str) {
    str = new(String)(str);

    ['bold', 'grey', 'yellow', 'red', 'green', 'cyan', 'blue', 'italic', 'underline'].forEach(function(style) {
        Object.defineProperty(str, style, {
            get: function() {
                return $(stylize(this, style));
            }
        });
    });
    return str;
};
stylize.$ = $;
exports.stylize = stylize;

var addCoverage = exports.addCoverage = function(code, filename) {
    if (!global.__cov) return code;
    return require('semicov').addCoverage(code, filename);
};

// cache for source code
var cache = {};
// cache for compiled scripts
var scriptCache = {};

function addSpaces(str, len, to_start) {
    var str_len = str.length;
    for (var i = str_len; i < len; i += 1) {
        if (!to_start) {
            str += ' ';
        } else {
            str = ' ' + str;
        }
    }
    return str;
}
exports.addSpaces = addSpaces;

function readYaml(file) {
    try {
        return require(file).shift();
    } catch (e) {
        console.log('Error in reading', file);
        console.log(e.message);
        console.log(e.stack);
    }
}
exports.readYaml = readYaml;

exports.existsSync = fs.existsSync || path.existsSync;

function recursivelyWalkDir(directory, filter, callback) {
    if(!callback) { callback = filter; filter = null; }
    var results = [];
    fs.readdir(directory, function(err, list) {
        if (err) return callback(err);
        var pending = list.length;
        if (!pending) return callback(null, results);

        list.forEach(function(file) {
            file = directory + '/' + file;
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    recursivelyWalkDir(file, filter, function(err, res) {
                        results = results.concat(res);
                        if (!--pending) callback(null, results);
                    });
                } else {
                    results.push(file);
                    if (!--pending) callback(null, results);
                }
            });
        });
    });
}
exports.recursivelyWalkDir = recursivelyWalkDir;

function ensureDirectoryExists(directory, root) {
    var dirs = directory.split('/')
        , dir = dirs.shift()
        , root = (root || '') + dir + '/';

    try { fs.mkdirSync(root); }
    catch (e) {
        if(!fs.statSync(root).isDirectory()) throw new Error(e);
    }

    return !dirs.length || ensureDirectoryExists(dirs.join('/'), root);
}
exports.ensureDirectoryExists = ensureDirectoryExists;