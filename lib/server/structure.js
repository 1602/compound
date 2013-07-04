var fs = require('fs');
var path = require('path');
var Module = require('module').Module;
var cs = require('coffee-script');

var debug = function(){};

module.exports = function(compound) {

    if (process.env.NODE_DEBUG && /structure/.test(process.env.NODE_DEBUG)) {
        debug = compound.log;
    }

    return function(root) {
        root = root || compound.root;
        debug('Loading structure from ' + root);
        read(root, 'views', 'app/views', 'view');
        read(root, 'helpers', 'app/helpers', true);
        read(root, 'controllers', 'app/controllers', 'controller');
        read(root, 'models', 'app/models', true);
    };

    function read(root, key, dir, doRequire, cts, prefix) {
        var contents;
        if (cts) {
            contents = cts;
        } else {
            if (!compound.structure[key]) {
                compound.structure[key] = {};
            }
            contents = compound.structure[key];
        }
        var abspath = root + '/' + dir;
        prefix = prefix || '';

        debug('read ' + key + ' from ' + abspath);

        if (fs.existsSync(abspath)) {
            fs.readdirSync(abspath).forEach(readAndWatch);
        }

        function readAndWatch(filename) {
            debug('read', filename);

            if (filename.match(/^\./)) {
                // skip files starting with point
                return;
            }
            var file = abspath + '/' + filename;
            var ext = filename.split('.').pop();
            if (fs.statSync(file).isDirectory()) {
                if (fs.existsSync(file + '/index.js')) {
                    contents[filename] =
                        doRequire ?
                        requireFile(file, doRequire) :
                        fs.readFileSync(file).toString();
                } else {
                    read(root, key, dir + '/' + filename, doRequire, contents, prefix + filename + '/');
                }
            } else {
                var name = prefix + filename.replace('.' + ext, '');
                if (doRequire !== 'view') {
                    name = name.replace(/\/index$/, '');
                }
                var item = doRequire ?
                    requireFile(file, doRequire) :
                    fs.readFileSync(file).toString();

                    if (name in contents) {
                        if ('function' === typeof item) {
                            for (var i in item.prototype) {
                                contents[name].prototype[i] = item.prototype[i];
                            }
                        }
                    } else {
                        contents[name] = item;
                    }

                if (ext === 'coffee' && !doRequire) {
                    try {
                        contents[name] = cs.compile(contents[name]);
                    } catch (e) {
                        console.log('Could not compile ' + name);
                        throw e;
                    }
                }

                if (false && compound.app.enabled('watch')) {

                    fs.watch(file, function() {
                        if (doRequire) {
                            delete Module._cache[file];
                            contents[name] = requireFile(file, doRequire);
                        } else {
                            contents[name] = fs.readFileSync(file).toString();

                            if (ext === 'coffee') {
                                contents[name] = cs.compile(contents[name]);
                            }

                        }
                    });
                }
            }
        }
    }
};

function requireFile(file, how) {
    if (how === true) return require(file);
    if (how === 'view') return path.normalize(file);
    if (how === 'controller') {
        if (file.match(/_controller/)) {
            var src = fs.readFileSync(file).toString();
            return file.match(/\.coffee$/) ? cs.compile(src) : src;
        } else {
            return require(file);
        }

    }
}

