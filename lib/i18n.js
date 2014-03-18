var fs = require('fs'),
    path = require('path');

/**
 * Initialize localization module
 */
module.exports = function i18n(compound, root) {
    var app = compound.app;
    root = root || compound.root;
    var dir = root + '/config/locales';

    if (!app) {
        return;
    }

    if (!compound.utils.existsSync(dir)) {
        app.set('i18n', 'off');
    }

    if (app.set('locale') === 'off' || app.set('i18n') === 'off') {
        compound.T = function () {
            return function (path, defVal) {
                return defVal;
            };
        };
        compound.t = compound.T();
        return;
    } else {
        compound.t = T(true);
        compound.T = T;
    }

    load(dir, compound);

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
                return translate(path, locale, defaultValue);
            };
        } else {
            // helper for local scope (controllers, views, helpers)
            // requires one param
            return function t(path, defaultValue) {
                return translate(path, t.locale, defaultValue);
            };
        }

        function translate(path, locale, defaultValue) {
            var translation = compound.__localeData[locale], substitute;

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
                translation = typeof defaultValue === 'undefined' ?
                    translationMissing(locale, path, defaultValue) :
                    defaultValue;
            }

            if (translation && substitute && substitute.length) {
                substitute.forEach(function(substitution) {
                    translation = translation.replace(/%/, substitution.toString().replace(/%/g, ''));
                });
            }

            return translation;
        }

        function translationMissing(locale, path, defaultValue) {

            if (compound.parent) {
                var translation;
                translation = compound.parent.t(path, locale, defaultValue);
                if (translation) {
                    return translation;
                }

            }

            switch (app.settings.translationMissing) {
            case 'display':
                return 'translation missing for ' + locale + '.' + path;
            case 'default':
            case undefined:
                var defLocale = app.settings.defaultLocale;
                return !defLocale || locale === defLocale ? '' : translate(path, defLocale, defaultValue);
            }
        }
    }

    T.localeSupported = function(localeName) {
        return !!compound.__localeData[localeName];
    };
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
 * @param {String} dir - absolute path to locales directory.
 */
function load(dir, compound) {
    var coffee;
    fs.readdirSync(dir).forEach(function(file) {
        if (file.match(/^\./)) return;

        var filename = dir + '/' + file;
        var code = fs.readFileSync(filename, 'utf8').toString();
        var obj;

        try {
            if (file.match(/\.ya?ml$/)) {
                var yaml = require(['yaml', 'js'].join('-')),
                obj = yaml.load(code);
                if (obj.shift) {
                    obj = obj.shift();
                }
            } else if (file.match(/\.json/)) {
                obj = JSON.parse(code);
            } else if (file.match(/\.coffee/)) {
                coffee = coffee || require('coffee-script');
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
            addTranslation(obj, compound);
        }

    });
}

/**
 * Add translation to `lang` to application locales collection
 */
function addTranslation(lang, compound) {
    Object.keys(lang).forEach(function(localeName) {
        var translations = lang[localeName];
        if (compound.locales.indexOf(localeName) === -1) {
            compound.locales.push([localeName, translations.lang && translations.lang.name || localeName]);
        }
        compound.__localeData[localeName] = compound.__localeData[localeName] || {};
        Object.keys(translations).forEach(function(namespace) {
            if ('object' === typeof compound.__localeData[localeName] && namespace in compound.__localeData[localeName]) {
                merge(compound.__localeData[localeName][namespace], translations[namespace]);
            } else {
                compound.__localeData[localeName][namespace] = translations[namespace];
            }
        });
    });

    function merge(dest, data) {
        for (var i in data) {
            if (i in dest && typeof dest[i] === 'object') {
                merge(dest[i], data[i]);
            } else {
                dest[i] = data[i];
            }
        }
    }
}
