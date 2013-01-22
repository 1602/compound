require.define('module', function () {});
require.define('fs', function(require, module, exports) {
    module.exports.readFileSync = function (path) {
        return compound.files[path];
    };

    module.exports.existsSync = function (path) {
        return path in compound.files;
    };
});

require('./node_modules/compound/lib/client/application');
var CompoundClient = require('./node_modules/compound/lib/client/compound');
var express = require('express');
var ejs = require('ejs');

var app = express();
var compound = window.compound = new CompoundClient(app, '{{ ROOT }}');

var fs = require('fs');

compound.files = {
    {{ FILES }}
};

Object.keys(compound.files).forEach(function (f) {
    if (f.match(/\.js$/)) {
        require.define(f, new Function('require', 'module', 'exports',
        '__dirname', '__filename', 'process', 'global', compound.files[f]));
    }
});

compound.structure = function () {
    return {
        controllers: {
            {{ CONTROLLERS }}
        },
        helpers: {
            {{ HELPERS }}
        },
        models: {
            {{ MODELS }}
        },
        views: {
            {{ VIEWS }}
        }
    };
};

function initializeBrowser() {
    $('a').live('click', compound.app.handle);
    $('form').live('submit', compound.app.handle);
    var skipFirst = true;

    $(window).bind('popstate', function () {
        if (skipFirst) {
            skipFirst = false;
            return;
        }
        compound.app.handle(location.pathname, true);
    });

}

$(initializeBrowser);

