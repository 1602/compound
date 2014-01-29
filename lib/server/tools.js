var path = require('path'),
    net = require('net'),
    fs = require('fs'),
    readline = require('readline'),
    childProcess = require('child_process'),
    sys = require('util'),
    util = sys,
    utils = require('../utils');

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
    // Create a separate 'global' context for the repl console
    (function() {
        var self = this;
        var repl = require('repl').start( {
            prompt: 'compound> ',
            useGlobal: true
        });

        repl.defineCommand('reload', {
            help: 'Reinitialize compound app',
            action: (this.reload = function() {
                // TODO: reload models
                this.app = compound.app;
                this.compound = compound;
                for (var model in compound.models) {
                    this[model] = compound.models[model];
                }
                if (args[0]) {
                    eval('with(self) { ' + args[0] + ' }');
                }
            })
        });

        this.c = function() {
            var l = arguments.length,
                message = 'Callback called with ' + l +
                ' argument' + (l === 1 ? '' : 's') + (l > 0 ? ':\n' : '');

            for (var i = 0; i < 10; i++) {
                if (i < arguments.length) {
                    self['_' + i] = arguments[i];
                    message += 'var _' + i + ' = ' + inspect(arguments[i]) + '\n';
                } else {
                    if (self.hasOwnProperty('_' + i)) {
                        delete self['_' + i];
                    }
                }
            }
            console.log(message);
        };

        function inspect(obj) {
            if (obj instanceof Array) {
                return obj.length === 0 ? '[]' : '[' + obj[0].constructor.modelName + ']' + '{' + obj.length + '}';
            } else {
                return String(obj);
            }
        }

        this.exit = function() {
            process.exit(0);
        };

        process.nextTick(this.reload);

        repl.on('exit', function() {
            console.log('Bye');
            process.exit(0);
        });
    })();

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
 * Compound server. Command optionally accept SOCKET or PORT and/or HOST
 * argument
 *
 * ```sh
 * compound server /tmp/app.sock # run server on UNIX socket
 * compound server 8000          # run server on 8000 port
 * compound s 3000 127.0.0.1     # run server on 127.0.0.1:3000 using shorter alias
 * PORT=80 compound s            # run server on 80 port usin env var PORT
 * ```
 *
 * @return {Boolean} false - to not quit process after executing.
 */
function server(compound, args) {
    var socket = process.env.SOCKET || args.shift();
    var app = compound.app;
    var listen = app.listen.bind(app);

    if (socket && !/^[0-9]+$/.test(socket)) {
        unlink_socket(socket, function() {
            listen(socket, function () {
                console.log('Compound server listening on %s within %s environment',
                socket, app.settings.env);
            });
        });
    } else {
        var port = process.env.PORT || socket || 3000;
        var host = process.env.HOST || args.shift() || "0.0.0.0";
        listen(port, host, function () {
            console.log('Compound server listening on %s:%d within %s environment',
            host, port, app.settings.env);
        });
    }
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
    var what = args.shift();
    compound.installer.init(compound);
    if(typeof what == "undefined" || what == null) {
        console.log('No package specified');
    } else {
        compound.installer.install(what);
    }
    return false;
}

exports.install = install;

install.help = {
    shortcut: 'x',
    usage: 'install [module]',
    description: 'Install compound module'
};

/**
 * Checks for socket status and remove stale
 *
 * @param {String} path - path to socket
 * @param {Function} cb - callback
 */
function unlink_socket(path, cb) {
    var sock = new net.Socket()
    sock.on('error', function(e) {
        // stale socket
        if (e.code == 'ECONNREFUSED') {
            fs.unlink(path);
        }
        cb();
    });
    sock.connect(path, function() {
        // let compound report error on
        // busy socket
        this.end();
        cb();
    });
}
