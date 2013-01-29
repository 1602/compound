var path = require('path');
var fs = require('fs');
var readline = require('readline');
var childProcess = require('child_process');
var sys = require('util');
var util = require('util');
var utils = require('./utils');

/**
 * Print routing map. Optionally accepts `filter` param, allowing to filter
 * output by method or helper name
 *
 * @param {Compound} compound - compound app.
 * @param {Array} args - command line args array.
 *
 * @return {Boolean} true.
 */
function routes(compound, args) {

    var mapper = compound.map;
    var addSpaces = utils.addSpaces;
    var dump = mapper.dump;
    var max_len = 0, helper_max_len = 0;
    var filter = (args.shift() || '').toUpperCase();
    var filtered = [];

    dump.forEach(function(data) {
        var method = data.method.toUpperCase();
        var isFiltered = !filter || filter === method ||
            data.helper.toUpperCase().search(filter) !== -1;
        if (isFiltered) {
            if (data.path.length > max_len) {
                max_len = data.path.length;
            }
            if (data.helper.length > helper_max_len) {
                helper_max_len = data.helper.length;
            }
            filtered.push(data);
        }
    });

    filtered.forEach(function(data) {
        var method = data.method.toUpperCase();
        console.log(
            addSpaces(data.helper, helper_max_len + 1, true) + ' ' +
            addSpaces(method, 7) +
            addSpaces(data.path, max_len + 1) +
            data.file + '#' + data.action
        );
    });

    return true;
}

exports.routes = routes;

/**
 * ```
 * $ compound routes
 *  projects GET    /projects           projects#index
 *    update ALL    /:user/:repo/update doc#update
 *           GET    /:user/:repo        doc#make
 *         * GET    /:user/:repo/*      doc#make
 * ```
 * same but filtered to show GET routes only
 * ```
 * $ compound routes get
 *  projects GET    /projects           projects#index
 *           GET    /:user/:repo        doc#make
 *         * GET    /:user/:repo/*      doc#make
 * ```
 * same but filtered to show routes with helper name contains `pro`
 * ```
 * $ compound routes get
 *  projects GET    /projects           projects#index
 * ```.
 */
routes.help = {
    shortcut: 'r',
    usage: 'routes [filter]',
    description: 'Display application routes'
};


/**
 * Debug console.
 * node REPL console with compound bindings
 *
 * Predefined helpers:
 *
 *  - `c` - callback, assigning it's arguments to _0 _1 .. _N variables
 *  - `reload` - reload models
 *  - `exit` - quit repl
 *
 * Usage Example:
 * ```
 * $ compound console
 * compound> User.all(c)
 * undefined
 * compound> [ [ 'hgetall', 'User:68' ],
 *  [ 'hgetall', 'User:69' ],
 *  [ 'hgetall', 'User:70' ],
 *  [ 'hgetall', 'User:71' ],
 *  [ 'hgetall', 'User:72' ],
 *  [ 'hgetall', 'User:73' ],
 *  [ 'hgetall', 'User:74' ],
 *  [ 'hgetall', 'User:75' ] ] '[2ms]'
 *  Callback called with 2 arguments:
 *  _0 = null
 *  _1 = [object Object],[object Object],...
 * compound> _1[0].toObject()
 * { id: '68',
 *   githubId: null,
 *   displayName: null,
 *   username: null,
 *   avatar: null }
 * ```
 *
 * @return {Boolean} true.
 *
 */
function railwayConsole(compound, args) {
    var ctx = require('repl').start('compound> ').context;

    ctx.reload = function() {
        // TODO: reload models
        ctx.app = compound.app;
        for (var model in compound.models) {
            ctx[model] = compound.models[model];
        }
    };

    ctx.c = function() {
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

    ctx.exit = function() {
        process.exit(0);
    };

    process.nextTick(ctx.reload);

    return false;
}

exports.console = railwayConsole;

railwayConsole.help = {
    shortcut: 'c',
    usage: 'console',
    description: 'Debug console'
};


exports.dbconsole = function dbconsole(compound, args) {
    var db = childProcess.spawn('mongo');
    var rli = readline.createInterface(process.stdin, process.stdout, autocomplete);
    var data = '';
    db.stdout.on('data', function(chunk) {
        data += chunk;
        write();
    });
    function write() {
        if (write.to) {
            clearTimeout(write.to);
        }
        setTimeout(function() {
            process.stdout.write(data);
            rli.prompt();
            data = '';
        }, 50);
    }
    rli.on('SIGINT', rli.close.bind(rli));
    rli.addListener('close', process.exit);
    rli.setPrompt('mongo > ');
    rli.addListener('line', function(line) {
        db.stdin.write(line + '\n');
    });
    // console.log(db);
    function autocomplete(input) {
        return [['help', 'test'], input];
    }
};

/**
 * Compound server. Command optionally accept PORT argument
 *
 * ```sh
 * compound server 8000      # run server on 8000 port
 * compound s 127.0.0.1 3000 # run server on 127.0.0.1:3000 using shorter alias
 * PORT=80 compound s        # run server on 80 port usin env var PORT
 * ```
 *
 * @return {Boolean} false - to not quit process after executing.
 */
function server(compound, args) {
    var port = process.env.PORT || args.shift() || 3000;
    var host = process.env.HOST || args.shift() || "0.0.0.0";
    var app = compound.app;
    app.listen(port, host, function () {
        console.log('Compound server listening on %s:%d within %s environment',
        host, port, app.settings.env);
    });
    return false;
}

exports.server = server;

server.help = {
    shortcut: 's',
    usage: 'server [port]',
    description: 'Run compound server'
};

/**
 * Install compound extension
 *
 * @return {Boolean} false - to not quit process after executing.
 */
function install(compound, args) {
    var app = compound.app;
    var what = args.shift(), where = args.shift();
    if (!what || !what.match(/\.git$/)) {
        console.log('What do you want to install?');
        return true;
    }

    if (!where) {
        var m = what.match(/\/([^\/]*?)\.git/);
        where = m[1];
    }

    if (!utils.existsSync(app.root + '/node_modules')) {
        fs.mkdirSync(app.root + '/node_modules');
    }

    var command = 'clone';
    if (utils.existsSync(app.root + '/.git')) {
        command = 'submodule add';
    }

    console.log('Installing ' + where + ' extension from ' + what + ' repo to node_modules/' + where);

    var cp = require('child_process');
    cp.exec('git ' + command + ' ' + what + ' node_modules/' + where, function() {
        if (utils.existsSync(app.root + '/npmfile.coffee')) {
            cp.exec('echo "require \'' + where + '\'" >> npmfile.coffee');
            console.log('Patched npmfile.coffee');
        } else {
            cp.exec('echo "require(\'' + where + '\');" >> npmfile.js');
            console.log('Patched npmfile.js');
        }
        var installScript = app.root + '/node_modules/' + where + '/install.js';
        if (utils.existsSync(installScript)) {
            console.log('Running installation script');
            require(installScript);
        } else {
            process.exit(0);
        }
    });
    return false;
}

exports.install = install;

install.help = {
    shortcut: 'x',
    usage: 'install gitUrl [extName]',
    description: 'Install compound eXtension'
};

