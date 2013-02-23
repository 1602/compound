var CompoundClient = require('./node_modules/compound/lib/client/compound');
var express = require('express');

var app = express();
app.set('env', '{{ NODE_ENV }}');
var compound = window.compound = new CompoundClient(app, '{{ ROOT }}');

var fs = require('fs');

window.files = window.files || {};
{{ FILES }}

{{ ENGINES }}

Object.keys(window.files).forEach(function (f) {
    return;
    if (f.match(/\.js$/)) {
        require.define(f, new Function('require', 'module', 'exports',
        '__dirname', '__filename', 'process', 'global', window.files[f]));
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

compound.init();

