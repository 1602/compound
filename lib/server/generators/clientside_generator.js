
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
CliensideGenerator.prototype.perform = function (args) {
    BaseGenerator.prototype.perform.apply(this, arguments);

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
        this.app.root + '/db/schema.coffee',
        this.app.root + '/config/routes.js',
        this.app.root + '/config/routes.coffee'
    ];
    this.loadRecursively(this.app.root + '/config', files);

    var templateVariables = {
        'CONTROLLERS': make('controllers', s.controllers),
        'MODELS': make('models', s.models),
        'HELPERS': make('helpers', s.helpers),
        'VIEWS': makeViews(s.views),
        'FILES': makeFiles(s.views, files),
        'ROOT': this.app.root,
        'NODE_ENV': process.env.NODE_ENV || 'development'
    };

    this.copyFile('client.js', 'client-side.js', templateVariables);

};

CliensideGenerator.prototype.loadRecursively = function (dir, files) {
    var t = this;
    fs.readdirSync(dir).forEach(function (file) {
        var path = dir + '/' + file;
        if (fs.statSync(path).isFile()) {
            files.push(path);
        } else {
            t.loadRecursively(path, files);
        }
    });
};

function makeViews(vs) {
    var buf = [];
    for (var i in vs) {
        buf.push('\'' + i + '\': ejs.compile(compound.files[\'' + vs[i] + '\'], {filename: \'' + vs[i] + '\'})');
    }
    return buf.join(',\n    ');

}

function makeFiles(vs, names) {
    var buf = [];
    for (var i in vs) {
        var code = JSON.stringify(fs.readFileSync(vs[i]).toString());
        buf.push('\'' + vs[i] + '\': ' + code + '');
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
        } else {
            code = JSON.stringify(code);
        }
        buf.push('\'' + name + '\': ' + code + '');
    });
    return buf.join(',\n    ');

}

function make(what, cs) {
    buf = [];
    for (var i in cs) {
        if (what === 'controllers' && i.match(/_controller$/)) {
            buf.push('\'' + i + '\': ' + JSON.stringify(cs[i]));
        } else {
            buf.push('\'' + i + '\': require(\'./app/' + what + '/' + i + '\')');
        }
    }
    return buf.join(',\n    ');
}

module.exports = CliensideGenerator;
