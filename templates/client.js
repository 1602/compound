require.define('module', function () {});
require.define('fs', function(require, module, exports) {
    var path = require('path');
    exports.readFileSync = function (path) {
        return compound.files[path];
    };

    exports.existsSync = function (name) {
        if (name in compound.files) return true;
        var dirFound = false;
        Object.keys(compound.files).forEach(function (dir) {
            if (path.dirname(dir).indexOf(name) !== -1) {
                dirFound = true;
            }
        });
        return dirFound;
    };

    exports.readdirSync = function (name) {
        var res = [];
        name = name.replace(/\/$/, '');
        Object.keys(compound.files).forEach(function (file) {
            if (path.dirname(file) === name) {
                res.push(path.basename(file));
            }
        });
        return res;
    };
});

require('./node_modules/compound/lib/client/application');
var CompoundClient = require('./node_modules/compound/lib/client/compound');
var express = require('express');

var app = express();
app.set('env', '{{ NODE_ENV }}');
var compound = window.compound = new CompoundClient(app, '{{ ROOT }}');

var fs = require('fs');

compound.files = {
    {{ FILES }}
};

{{ ENGINES }}

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

