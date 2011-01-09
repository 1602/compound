
var fs = require('fs');

desc('Draw routes');
task('routes', [], function () {
    function print (method) {
        return function () {
            //console.log(method + "\t" + arguments[0]);
        };
    }
    function add_spaces (str, len, to_start) {
        var str_len = str.length;
        for (var i = str_len; i < len; i += 1) {
            if (!to_start) {
                str += ' ';
            } else {
                str = ' ' + str;
            }
        }
        return str;
    }
    var mapper = require('express-on-railway').init(__dirname, {
        get: print('get'),
        post: print('post'),
        delete: print('delete'),
        put: print('put')
    }).routes;
    var dump = mapper.dump();

    var max_len = 0, helper_max_len = 0;
    dump.forEach(function (data) {
        if (data.path.length > max_len) {
            max_len = data.path.length;
        }
        if (data.helper.length > helper_max_len) {
            helper_max_len = data.helper.length;
        }
    });
    dump.forEach(function (data) {
        console.log(
            add_spaces(data.helper, helper_max_len + 1, true) + ' ' +
            data.method.toUpperCase() + "\t" +
            add_spaces(data.path, max_len + 1) +
            data.file + "#" + data.action
        );
    });
});

desc('Check and install required packages');
task('depends', [], function () {
    var npm = require('npm'), cb_counter = 0, wait_for_all = function () {
        if (--cb_counter === 0) complete();
    };
    npm.load({}, function (err) {
        if (err) throw err;
        npm.commands.ls(['installed'], true, function (err, packages) {
            var requirements = JSON.parse(fs.readFileSync('config/requirements.json'));
            requirements.forEach(function (package) {
                cb_counter += 1;
                if (packages[package]) {
                    console.log('Package ' + package + ' is already installed');
                    wait_for_all();
                } else {
                    npm.commands.install([package], function (err, data) {
                        wait_for_all();
                    });
                }
            });
        });
    });
}, true);
