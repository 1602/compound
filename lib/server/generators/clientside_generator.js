
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

    var templateVariables = {
        'CONTROLLERS': make('controllers', s.controllers),
        'MODELS': make('models', s.models),
        'HELPERS': make('helpers', s.helpers),
        'VIEWS': makeViews(s.views),
        'FILES': makeFiles(s.views, [
            this.app.root + '/db/schema.js',
            this.app.root + '/config/routes.js'
        ]),
        'ROOT': this.app.root
    };

    this.copyFile('client.js', 'client-side.js', templateVariables);

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
        var code = JSON.stringify(fs.readFileSync(name).toString());
        buf.push('\'' + name + '\': ' + code + '');
    });
    return buf.join(',\n    ');

}

function make(what, cs) {
    buf = [];
    for (var i in cs) {
        buf.push('\'' + i + '\': require(\'./app/' + what + '/' + i + '\')');
    }
    return buf.join(',\n    ');
}

module.exports = CliensideGenerator;
