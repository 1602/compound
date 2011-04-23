var fs = require('fs'),
    yaml = require('yaml'),
    path = require('path'),
    localeData = {};

exports.init = function () {
    var dir = app.root + '/config/locales';
    if (!path.existsSync(dir)) {
        return false;
    }

    fs.readdirSync(dir).forEach(function (file) {
        var filename = dir + '/' + file;
        var code = fs.readFileSync(filename, 'utf8').toString();
        var obj;
        try {
            if (file.match(/\.yml$/)) {
                obj = yaml.eval(code);
            } else if (file.match(/\.json/)) {
                obj = JSON.parse(code);
            }
        } catch (e) {
            console.log('Parsing file ' + filename);
            console.log(e);
            console.log(e.stack);
        }
        addTranslation(obj);
    });
};

function addTranslation (lang) {
    Object.keys(lang).forEach(function (localeName) {
        localeData[localeName] = localeData[localeName] || {};
        Object.keys(lang[localeName]).forEach(function (namespace) {
            localeData[localeName][namespace] = lang[localeName][namespace];
        });
    });
}


function T (global) {
    if (global) {
        // helper for global scope (models, initializers, etc)
        // requires two params (locale expected)
        return function t (path, locale) {
            if (!locale) {
                throw new Error('Locale expected');
            }
            return translate (path, locale);
        };
    } else {
        // helper for local scope (controllers, views, helpers)
        // requires one param
        return function t (path) {
            return translate(path, t.locale || 'en');
        };
    }

    function translate (path, locale) {
        var translation = localeData[locale];
        path.split('.').forEach(function (pathToken) {
            translation = translation[pathToken] || 'translation missing for ' + locale + '.' + path;
        });
        return translation;
    }
};

global.t = T(true);
global.T = T;
