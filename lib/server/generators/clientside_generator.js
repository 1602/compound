
/**
 * lib/generators/clienside_generator.js
 *
 * @defines {CliensideGenerator}
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
  , BaseGenerator = require('./base_generator')
  , path = require('path');

/**
 * Generates a clienside framework
 *
 * @constructor
 */
function CliensideGenerator() {
    CliensideGenerator.super_.call(this);
};
util.inherits(CliensideGenerator, BaseGenerator);

/**
 * Command line aliases
 */
CliensideGenerator.aliases = [ 'clientside', 'cs' ];

/**
 * Performs the generator action
 *
 * @param {Array} arguments
 */
CliensideGenerator.prototype.perform = function (result) {
    BaseGenerator.prototype.perform.apply(this, arguments);

    this.result = result;
    this.createDirectoryStructure();
    this.copyFiles();
};

/**
 * Creates the basic directory structure
 */
CliensideGenerator.prototype.createDirectoryStructure = function () {
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
CliensideGenerator.prototype.copyFiles = function () {
    var self = this;
    var s = this.app.compound.structure;

    var files = [
        this.app.root + '/db/schema.js',
        this.app.root + '/db/schema.coffee'
    ];

    var engines = [];
    var templateVariables = {
        'CONTROLLERS': make('controllers', s.controllers, this.app.root),
        'MODELS': make('models', s.models, this.app.root),
        'HELPERS': make('helpers', s.helpers, this.app.root),
        'VIEWS': make('views', s.views, this.app.root),
        'FILES': makeFiles(s.views, files, engines, this.app, this.result),
        'ENGINES': engines.map(requireEngine).join('\n'),
        'ROOT': '',
        'NODE_ENV': process.env.NODE_ENV || 'development',
        'INITIALIZERS': exposeInitializers(files)
    };

    this.copyFile('client.js', 'client-side.js', templateVariables);

};

// CliensideGenerator.prototype.loadRecursively = function (dir, files) {
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

function makeFiles(vs, names, engines, app, result) {
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
            result.push(name);
            code = JSON.stringify(code);
        } else {
            code = JSON.stringify(code);
        }
        buf.push('window.files[\'' + name.replace(app.root, '') + '\'] = ' + code + '');
    });
    return buf.join(';\n    ');

}

function make(what, cs, root) {
    buf = [];
    for (var i in cs) {
        if (what === 'controllers' && i.match(/_controller$/)) {
            buf.push('\'' + i + '\': ' + JSON.stringify(cs[i].replace(root, '')));
        } else if (what === 'views') {
            buf.push('\'' + i + '\': ' + JSON.stringify(cs[i].replace(root, '')));
        } else {
            buf.push('\'' + i + '\': require(\'./app/' + what + '/' + i + '\')');
        }
    }
    return buf.join(',\n    ');
}

module.exports = CliensideGenerator;
