
/**
 * lib/generators/clienside_generator.js
 *
 * @defines {ClientsideGenerator}
 * @since {1.1.4}
 * @creator {Anatoliy Chakkaev <mail@anatoliy.in>}
 * @description {
 *   Generates client-side features
 * }
 */

/**
 * Module dependencies
 */
var util = require('util')
  , fs = require('fs')
  , yaml = require('yaml-js')
  , coffee = require('coffee-script')
  , required
  , BaseGenerator = require('./base_generator')
  , cp = require('child_process')
  , path = require('path');

/**
 * Generates a clienside framework
 *
 * @constructor
 */
function ClientsideGenerator() {
    ClientsideGenerator.super_.call(this);
};
util.inherits(ClientsideGenerator, BaseGenerator);

/**
 * Command line aliases
 */
ClientsideGenerator.aliases = [ 'clientside', 'cs' ];

/**
 * Performs the generator action
 *
 * @param {Array} arguments
 */
ClientsideGenerator.prototype.perform = function (args) {
    BaseGenerator.prototype.perform.apply(this, arguments);
    try {
        if (this.options.watch) required = require('required');
    } catch (e) {
        console.log('Run npm install required to be able to watch for changes in files');
    }

    this.watched = {};
    this.createDirectoryStructure();
    this.copyFiles();
    this.browserify();
    return true;
};

/**
 * Creates the basic directory structure
 */
ClientsideGenerator.prototype.createDirectoryStructure = function () {
    var self = this;
    [
        // 'public/',
        // 'public/javascripts/'
    ].forEach(function (dir) {
        self.createDirectory(dir);
    });
};

/**
 * Copy files from templates directory
 */
ClientsideGenerator.prototype.copyFiles = function () {
    var self = this;
    var s = this.app.compound.structure;

    var files = [
        this.app.root + '/db/schema.js',
        this.app.root + '/db/schema.coffee'
    ];

    var engines = [];
    var templateVariables = {
        'CONTROLLERS': this.make('controllers'),
        'MODELS': this.make('models'),
        'HELPERS': this.make('helpers'),
        'VIEWS': this.make('views'),
        'FILES': makeFiles(s.views, files, engines, this.app),
        'ENGINES': engines.map(requireEngine).join('\n'),
        'ROOT': '',
        'NODE_ENV': process.env.NODE_ENV || 'development',
        'INITIALIZERS': exposeInitializers(files)
    };

    try {
        fs.unlinkSync(this.app.root + '/client-side.js');
    } catch (e) {}
    this.copyFile('client.js', 'client-side.js', templateVariables);

};

ClientsideGenerator.prototype.browserify = function browserify() {
    var generator = this;
    try {
        var browserify = require('browserify');
    } catch (e) {
        return console.log('Run npm install required browserify in order to use',
        'clientside compound');
    }
    var b = browserify();
    var appRoot = this.app.root;
    var shims = this.shims = {
        'express': '../../client/application.js',
        'fs': '../../client/fs.js',
        'module': '../../../templates/blank.js',
        'compound': '../../client/fake-compound.js'
    };
    Object.keys(shims).forEach(function (name) {
        var file = path.resolve(__dirname + '/' + shims[name]);
        var opts = getOpts();
        opts.expose = name;
        b.require(file, opts);
    });

    b.add(appRoot + '/client-side.js');
    var time = Date.now();
    b.bundle(getOpts(), tryMinify);

    function getOpts() {
        return {
            insertGlobals: true,
            detectGlobals: false,
            ignoreMissing: true
        };
    }

    function tryMinify(err, data) {
        var source = appRoot + '/public/javascripts/compound';
        fs.writeFileSync(source + '.js', data);

        generator.watch(appRoot + '/client-side.js', true);

        console.log('browserify finished in ' + (Date.now() - time) + 'ms:', data.length, 'bytes written');
        try {
            var uglify = require('uglify-js');
        } catch (e) {
            console.log('Run "npm install uglify-js" command if you want to minify resulting bundle');
        }
        if (!uglify) return done();

        fs.writeFileSync(source + '.min.js', uglify.minify(source + '.js').code);
        console.log('minified',
        (fs.statSync(source + '.js').size >> 10) + 'K',
        '->',
        (fs.statSync(source + '.min.js').size >> 10) + 'K');
        done();

        function done() {
            if (generator.options.quit) process.exit();
        }
    }

};

ClientsideGenerator.prototype.watch = function watch(file, ignoreSelf) {
    var generator = this;
    if (!required) return;

    required(file, {ignoreMissing: true, includeSource: false}, function (err, deps) {
        watchChangesIn(deps);
        done();
    });

    var watched = {};
    if (!ignoreSelf) {
        watched[file] = file;
    }
    function watchChangesIn(deps) {
        deps.forEach(function (node) {
            if (node.id in generator.shims) {
                node.filename = path.resolve(__dirname + '/' + generator.shims[node.id]);
                node.deps = [];
            }
            // console.log(node.filename);
            if (node.id in watched || !node.filename ||
            (node.filename.match(/node_modules/) && !node.filename.match(/compound/)
                )) return;

            watched[node.id] = node.filename;
            if (node.deps) watchChangesIn(node.deps);
        });
    }

    function done() {
        Object.keys(watched).forEach(function (id) {
            if (generator.watched[watched[id]]) return;
            generator.watched[watched[id]] = true;
            console.log('watching ' + id);
            fs.watch(watched[id], function () {
                console.log('Changed ' + id + ', rebuilding bundle...');
                generator.rebuild();
            });
        });
    }
};

ClientsideGenerator.prototype.rebuild = function rebuild() {
    cp.exec('cd ' + this.app.root + ' && ./node_modules/.bin/' +
    'compound g cs --quit', function (err, stdout, stderr) {
        console.log(stdout);
    });
};

// ClientsideGenerator.prototype.loadRecursively = function (dir, files) {
//     var t = this;
//     fs.readdirSync(dir).forEach(function (file) {
//         var path = dir + '/' + file;
//         if (fs.statSync(path).isFile()) {
//             files.push(path);
//         } else {
//             t.loadRecursively(path, files);
//         }
//     });
// };

function exposeInitializers(files) {
    var res = [];
    files.forEach(function (name) {
        var m = name.match(/config\/initializers\/[^\.][^\/]*?.(js|coffee)/);
        if (m) {
            res.push('require(\'./' + m[0] + '\')');
        }
    });
    return res.join(',');
}

function requireEngine(ext) {
    return 'require(\'' + ext.substr(1) + '\');';
}

function makeFiles(vs, names, engines, app) {
    var buf = [];
    for (var i in vs) {
        var filename = vs[i];
        var ext = path.extname(filename);
        var code = JSON.stringify(fs.readFileSync(filename).toString());
        buf.push('window.files[\'' + filename.replace(app.root, '') + '\'] = ' + code + '');
        if (!app.engines[ext] && engines.indexOf(ext) === -1) {
            engines.push(ext);
        }
    }
    names.forEach(function (name) {
        if (!fs.existsSync(name)) return;
        var code = fs.readFileSync(name).toString();
        if (name.match(/\.ya?ml$/)) {
            code = JSON.stringify(JSON.stringify(yaml.load(code)));
            name = name.replace(/ya?ml$/, 'json');
        } else if (name.match(/\.coffee$/)) {
            code = JSON.stringify(coffee.compile(code));
            name = name.replace(/coffee$/, 'js');
        } else if (name.match(/\.js$/)) {
            code = JSON.stringify(code);
        } else {
            code = JSON.stringify(code);
        }
        buf.push('window.files[\'' + name.replace(app.root, '') + '\'] = ' + code + '');
    });
    return buf.join(';\n    ');

}

ClientsideGenerator.prototype.make = function make(what) {
    var s = this.app.compound.structure;
    var cs = s[what];
    var root = this.app.root;
    buf = [];
    for (var i in cs) {
        if (what === 'controllers' && i.match(/_controller$/)) {
            this.watch(root + '/app/controllers/' + i + '.js');
            buf.push('\'' + i + '\': ' + JSON.stringify(cs[i]));
        } else if (what === 'views') {
            this.watch(cs[i]);
            buf.push('\'' + i + '\': ' + JSON.stringify(cs[i].replace(root, '')));
        } else {
            this.watch(root + '/app/' + what + '/' + i + '.js')
            buf.push('\'' + i + '\': require(\'./app/' + what + '/' + i + '\')');
        }
    }
    return buf.join(',\n    ');
}

module.exports = ClientsideGenerator;
