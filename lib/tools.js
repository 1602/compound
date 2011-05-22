
exports.routes = routes;

routes.help = {
    shortcut:    'r',
    usage:       'routes [filter]',
    description: 'Display application routes, with possibility to filter by method or helper'
};

function routes () {

    var mapper = railway.routeMapper;
    var addSpaces = railway.utils.addSpaces;
    var dump = mapper.dump();
    var max_len = 0, helper_max_len = 0;
    var filter = (args.shift() || '').toUpperCase();
    var filtered = [];

    dump.forEach(function (data) {
        var method = data.method.toUpperCase();
        if (!filter || filter === method || data.helper.toUpperCase().search(filter) !== -1) {
            if (data.path.length > max_len) {
                max_len = data.path.length;
            }
            if (data.helper.length > helper_max_len) {
                helper_max_len = data.helper.length;
            }
            filtered.push(data);
        }
    });

    filtered.forEach(function (data) {
        var method = data.method.toUpperCase();
        console.log(
            addSpaces(data.helper, helper_max_len + 1, true) + ' ' +
            addSpaces(method, 7) +
            addSpaces(data.path, max_len + 1) +
            data.file + "#" + data.action
        );
    });

    return true;
}

exports.console = console;

routes.help = {
    shortcut:    'c',
    usage:       'console',
    description: 'Debug console'
};

function console () {
    var ctx = require('repl').start('railway> ').context;

    ctx.reload = function () {
        global.models = {};
        ctx.app = app;
        app.reloadModels();

        for (var m in models) {
            ctx[m] = models[m];
        }
    };

    ctx.c = function () {
        var l = arguments.length,
            message = 'Callback called with ' + l +
                ' argument' + (l === 1 ? '' : 's') + (l > 0 ? ':\n' : '');

        for (var i = 0; i < 10; i++) {
            if (i < arguments.length) {
                ctx['_' + i] = arguments[i];
                message += '_' + i + ' = ' + arguments[i] + '\n';
            } else {
                if (ctx.hasOwnProperty('_' + i)) {
                    delete ctx['_' + i];
                }
            }
        }
        console.log(message);
    };

    ctx.exit = function () {
        process.exit(0);
    };

    ctx.reload();

    return false;
}

exports.server = server;

server.help = {
    shortcut: 's',
    usage: 'server [port]',
    description: 'Run railway server'
};

function server () {
    app.listen(args.shift() || 3000);
    console.log("Railway server listening on port %d", app.address().port)
    return false;
}
