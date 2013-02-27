
var express = require('express');
var util = require('util');
var fs = require('fs');
var CompoundClient = require('compound/lib/client/compound');

module.exports = instantiateApplication;

if (!window.compound) {
    window.compound = instantiateApplication('{{ ROOT }}');

    $(function initializeBrowser() {
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

    });
}

function instantiateApplication(root) {

    var app = express();
    app.set('env', '{{ NODE_ENV }}');
    var compound = new CompoundClient(app, root);

    var fs = require('fs');

    window.files = window.files || {};

    {{ FILES }}

    {{ ENGINES }}

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

    compound.init();

    return compound;

};
