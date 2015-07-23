var path = require('path'),
    net = require('net'),
    fs = require('fs'),
    vm = require('vm'),
    os = require('os'),
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
        var repl = require('repl').start({
            prompt: 'compound> ',
            useGlobal: true,
            eval: function(code, context, filename, callback) {
                var err, result, script;
                try {
                    script = vm.createScript(code, {
                        filename: filename,
                        displayErrors: false
                    });
                } catch(e) {
                    err = e;
                }
                if (!err) {
                    try {
                        result = script.runInThisContext({ displayErrors: false });
                    } catch (e) {
                        err = e;
                        if (err && process.domain) {
                            process.domain.emit('error', err);
                            process.domain.exit();
                            return;
                        }
                    }
                }
                if (result && result.constructor && result.constructor.name === 'Promise' && result.then) {
                    result.then(function(result) {
                        callback(null, result);
                    }, function(err) {
                        callback(err);
                    });
                } else {
                    callback(err, result);
                }
            }
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

        repl.defineCommand('keys', {
            help: 'Iterates through a list of nested keys. Prints by default. Usage: keys(object, depth)',
            action: (this.keys = function keys(obj, depth, level, iterator) {
                iterator = iterator || console.log;
                for(var key in obj) {
                    iterator((new Array(level || (level=0))).join('-'), '>', key);
                    if(obj[key] && typeof(obj[key]) == 'object') {
                        if(depth) {
                            keys(obj[key], --depth, level+3, iterator);
                        }
                    }
                };
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

        // Set up cli history
        var historyFile = path.join(os.tmpdir(), '.compound_history');
        var historySearchMode = false;
        var historySearchString = '';
        var historySearchPrompt = '(history-search)`%`:';
        var _ttyWrite = repl.rli._ttyWrite;
        repl.rli.on('line', function(line) {
            // Write to history file
            fs.appendFile(historyFile, '\n' + line);
        });
        fs.readFile(historyFile, {encoding: 'utf8'}, function(err, data) {
            if (err) {
                return;
            }
            // Remove the last element (newline)
            var history = data.split('\n').slice(1);
            repl.rli.history = history.reverse();
        });
        // Search through cli history
        repl.rli.input.on('keypress', function(s, key) {
            if (!key) return;
            if (historySearchMode) {
                if (key.name === 'return' || key.name === 'enter' || key.name === 'linefeed') {
                    // Done searching, run command
                    handleHistory(true);
                    return;
                }
                if (key.name === 'left' || key.name === 'right') {
                    handleHistory(false);
                    return;
                }
                return;
            }
            if (key.ctrl && key.name === 'r') {
                repl.prompt = historySearchPrompt;
                repl.rli._ttyWrite = ttyWriteHistory;
                historySearchMode = true;
                historySearchString = repl.rli.line;
                repl.rli.line = '';
                refreshHistoryPrompt();
                return;
            }
        });
        function ttyWriteHistory(s, key) {
            if (!key) {
                historySearchString += s;
                refreshHistoryPrompt();
                return;
            }
            if (key.name.length === 1) {
                historySearchString += key.name;
                refreshHistoryPrompt();
                return;
            }
            if (key.name === 'backspace') {
                historySearchString = historySearchString.substr(0, historySearchString.length - 1);
                refreshHistoryPrompt();
                return;
            }
            if (key.name === 'space') {
                historySearchString += ' ';
                refreshHistoryPrompt();
                return;
            }
        }
        function refreshHistoryPrompt() {
            repl.prompt = historySearchPrompt.split('%').join(historySearchString);
            repl.rli.line = matchHistory(historySearchString);
            repl.displayPrompt();
        }
        function matchHistory(match) {
            if (match.length < 1) return '';
            // Search through the repl.rli.history array for a match
            for (var i = 0; i < repl.rli.history.length; ++i) {
                if (repl.rli.history[i].match(match)) {
                    repl.rli.historyIndex = i;
                    return repl.rli.history[i];
                }
            }
            return '';
        }
        function handleHistory(run) {
            historySearchMode = false;
            repl.prompt = 'compound> ';
            repl.displayPrompt();
            repl.rli._ttyWrite = _ttyWrite;
            if (run) {
                console.log('');
                var cmd = repl.rli.line;
                repl.rli.line = '';
                repl.rli._onLine(cmd);
                repl.displayPrompt();
            }
            historySearchString = '';
        }

        repl.on('exit', function() {
            // Overwrite history file to remove old data
            fs.writeFile(historyFile, '\n' + repl.rli.history.reverse().join('\n'), function(err) {
                if (err) {
                    console.log('Could not write history file', err);
                }
                console.log('Bye');
                process.exit(0);
            });
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
