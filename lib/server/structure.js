var fs = require('fs');
var path = require('path');
var Module = require('module').Module;
var cs = require('coffee-script');

var debug = function(){};

module.exports = function(compound) {

    if (process.env.NODE_DEBUG && /structure/.test(process.env.NODE_DEBUG)) {
        debug = function(x) {
            compound.log(x);
        };
    }

    compound.structure.register = function(what, info) {
        debug('register ' + what + ':' + JSON.stringify(info));
        var key = what + 's';
        compound.structure.paths[key][info.name] = info;
        var contents = compound.structure[key];
        if (compound.app.enabled('watch') && what !== 'view') {
            if (!info.stat) {
                info.stat = fs.statSync(info.file);
            }
            contents.__defineGetter__(info.name, function() {
                var stat = fs.statSync(info.file);
                var file = info;
                if (!file.cache || file.stat && file.stat.mtime < stat.mtime) {
                    delete Module._cache[info.file];
                    file.cache = requireFile(info.file);
                }
                file.stat = stat;
                return file.cache;
            });
        } else {
            contents[info.name] = requireFile(info.file);
        }

        function requireFile(file) {
            switch (what) {
                case 'view':
                return path.normalize(file);
                case 'controller':
                if (file.match(/_controller/)) {
                    var src = fs.readFileSync(file).toString();
                    return file.match(/\.coffee$/) ? cs.compile(src) : src;
                } else {
                    return require(file);
                }
                default:
                return require(file);
            }
        }
    };

    return function(root) {
        root = root || compound.root;
        debug('Loading structure from ' + root);
        read(root, 'view');
        read(root, 'helper');
        read(root, 'controller');
        read(root, 'model');
    };

    function read(root, key, dir, prefix) {
        var dir = dir || 'app/' + key + 's';
        var contents = compound.structure[key + 's'];
        var directory = compound.structure.paths[key + 's'];
        var abspath = root + '/' + dir;
        prefix = prefix || '';

        debug('read ' + key + 's from ' + abspath);

        if (fs.existsSync(abspath)) {
            fs.readdirSync(abspath).forEach(readNode);
        }

        function readNode(filename) {
            debug('read ' + filename);

            if (filename.match(/^\./)) {
                // skip files starting with point
                return;
            }
            var file = abspath + '/' + filename;
            var ext = path.extname(filename);
            var stat = fs.statSync(file);
            if (stat.isDirectory()) {
                if (fs.existsSync(file + '/index.js')) {
                    compound.structure.register(key, {
                        name: filename,
                        file: file + '/index.js',
                        stat: stat
                    });
                } else {
                    read(root, key, dir + '/' + filename, prefix + filename + '/');
                }
            } else {
                var name = prefix + filename.replace(ext, '');
                if (key !== 'view') {
                    name = name.replace(/\/index$/, '');
                }

                if (key === 'controllers' && name in contents) {
                    for (var i in item.prototype) {
                        contents[name].prototype[i] = item.prototype[i];
                    }
                } else {
                    compound.structure.register(key, {
                        name: name,
                        file: path.normalize(file),
                        stat: stat
                    });
                }

            }
        }

    }
};


