var CompoundClient = require('./node_modules/compound/lib/client/compound');
var express = require('express');
var util = require('util');
var fs = require('fs');

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

compound.on('configure', function () {
    console.log('configure');
    [
        require('./config/environment'),
        require('./config/environments/{{ NODE_ENV }}')
    ].forEach(function (m) {
        if (m && m.call) m(compound);
    });
}).on('routes', function (map) {
    var r = require('./config/routes');
    if (r && r.routes) r.routes(map)
}).on('extensions', function (c) {
    var f = require('./config/autoload');
    if (typeof f === 'function') {
        var s = f(compound);
        s && s.forEach && s.forEach(function (m) {
            m && m.init && m.init(c);
        });
    }
}).on('initializers', function (c) {
    [{{ INITIALIZERS }}].forEach(function (m) {
        m(c);
    });
});

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
