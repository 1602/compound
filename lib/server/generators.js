/**
 * lib/generators.js
 *
 * @defines {Generators}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Manages all generators
 * }
 */

/**
 * Generators class
 * Manages all generators
 *
 * @constructor
 */
function Generators () {
    this.generators = {};
    this.generatorAliases = {};

    this.loadGenerators([
        'app',
        'model',
        'crud',
        'controller'
    ]);
};

/**
 * Initialization
 *
 * @param {Compound} Compound app
 */
Generators.prototype.init = function (app) {
    this.app = app;
};

/**
 * Performs a generator action
 *
 * @param {String} Generator alias
 * @param {Array}  Arguments (optional)
 */
Generators.prototype.perform = function (alias, args) {
    var generator;
    if (generator = this.generatorForAlias(alias)) {
        generator.init(this.app, args);
        return generator.perform(args);
    } else {
        console.log('Generator "' + alias + '" not found');
    }
};

/**
 * Register generator
 *
 * @param {String} - name of generator
 * @param {Generator} - constructor of generator
 *
 * Constructor should create object with `init(app, args)` and `perform` methods
 */
Generators.prototype.register = function register(name, generator) {
    this.generators[name] = generator;
    this.addAliases(generator);
};


/**
 * Returns a generator matching the given alias
 *
 * @param {String} Generator alias
 */
Generators.prototype.generatorForAlias = function (alias) {
    if (this.generatorAliases.hasOwnProperty(alias)) {
        return new this.generatorAliases[alias];
    } else if (alias in this.generators) {
        return new this.generators[alias];
    }
};

/**
 * Loads generators
 * 
 * @param {Array} List of generator names
 */
Generators.prototype.loadGenerators = function (generators) {
    var self = this;

    generators.forEach(function (generator) {
        self.generators[generator] = require('./generators/' + generator + '_generator');
        self.addAliases(self.generators[generator]);
    });
};

/**
 * Adds command line aliases for a specific generator
 * so that it can be called using `compound generate generatorAlias`
 *
 * @param {Generator} Generator class
 */
Generators.prototype.addAliases = function addAliases(generator) {
    var self = this;

    generator.aliases.forEach(function (alias) {
        self.generatorAliases[alias] = generator;
    });
};

Generators.prototype.list = function () {
    return Object.keys(this.generators).join(', ');
};

module.exports = new Generators();
