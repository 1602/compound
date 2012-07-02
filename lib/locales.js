var fs = require('fs'),
    yaml = require('yaml-js'),
    coffee = require('coffee-script'),
    path = require('path'),
    localeData = {};

/**
 * Initialize localization module
 */
exports.init = function () {
    var dir = app.root + '/config/locales';
    if (!railway.utils.existsSync(dir)) {
        return false;
    }

    app.locales = app.locales || [];

    exports.load(dir);
};

/**
 * Load localization files from `dir`. Locales can be in yaml, json or coffee
 * format
 *
 * Example locale.yml file:
 *
 *    en:
 *      key: 'Value'
 *
 * @param {String} dir - absolute path to locales directory
 */
exports.load = function (dir) {
    fs.readdirSync(dir).forEach(function (file) {
        if (file.match(/^\./)) return;
        var filename = dir + '/' + file;
        var code = fs.readFileSync(filename, 'utf8').toString();
        var obj;
        try {
            if (file.match(/\.ya?ml$/)) {
                obj = require(filename).shift();
            } else if (file.match(/\.json/)) {
                obj = JSON.parse(code);
            } else if (file.match(/\.coffee/)) {
                obj = coffee.eval(code);
            } else {
                console.log('Unsupported extension of locale file ' + filename);
            }
        } catch (e) {
            console.log('Parsing file ' + filename);
            console.log(e);
            console.log(e.stack);
        }
        if (obj) {
            addTranslation(obj);
        }
    });
};

/**
 * Add translation to `lang` to application locales collection
 */
function addTranslation(lang) {
    Object.keys(lang).forEach(function (localeName) {
        var translations = lang[localeName];
        if (app.locales.indexOf(localeName) === -1) {
            app.locales.push([localeName, translations.lang && translations.lang.name || localeName]);
        }
        localeData[localeName] = localeData[localeName] || {};
        Object.keys(translations).forEach(function (namespace) {
            localeData[localeName][namespace] = translations[namespace];
        });
    });
}


/**
 * Global translation helper
 *
 * @param {Boolean} global
 * @public
 */
function T(global) {
    if (global) {
        // helper for global scope (models, initializers, etc)
        // requires two params (locale expected)
        return function t(path, locale, defaultValue) {
            if (!locale) {
                throw new Error('Locale expected');
            }
            return translate (path, locale);
        };
    } else {
        // helper for local scope (controllers, views, helpers)
        // requires one param
        return function t(path, defaultValue) {
            return translate(path, t.locale, defaultValue);
        };
    }

    function translate(path, locale, defaultValue) {
        var translation = localeData[locale], substitute;

        function nextPathItem(token) {
            return (translation = translation[token]);
        }

        if (typeof path === 'string') {
            substitute = false;
        } else {
            substitute = path;
            path = substitute.shift();
        }

        if (!translation || !path.split('.').every(nextPathItem)) {
            translation = defaultValue || translationMissing(locale, path);
        }

        if (translation && substitute && substitute.length) {
            substitute.forEach(function (substitution) {
                translation = translation.replace(/%/, substitution.toString().replace(/%/g, ''));
            });
        }
        return translation;
    }

    function translationMissing(locale, path) {
        switch (app.settings.translationMissing) {
        case 'display':
            return 'translation missing for ' + locale + '.' + path;
        case 'default':
        case undefined:
            var defLocale = app.settings.defaultLocale;
            return !defLocale || locale === defLocale ? '' : translate(path, defLocale);
        }
    }
};

T.localeSupported = function (localeName) {
    return !!localeData[localeName];
};

global.t = T(true);
global.T = T;
