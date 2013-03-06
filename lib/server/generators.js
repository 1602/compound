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
    this.quiet = false;
};

/**
 * Initialization
 *
 * @param {Compound} Compound app
 */
Generators.prototype.init = function (app) {
    this.app = app;
    this.register('app', require('./generators/app_generator'));
};

/**
 * Performs a generator action
 *
 * @param {String} Generator name
 * @param {Array}  Arguments (optional)
 */
Generators.prototype.perform = function (name, args) {
    var generator;
    if (generator = this.generatorForAlias(name)) {
        generator.init(this.app, args);
        generator.quiet = this.quiet;
        return generator.perform(args);
    } else {
        console.log('Generator "' + name + '" not found');
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
    var self = this;

    this.generators[name] = generator;

    generator.aliases.forEach(function (alias) {
        self.generatorAliases[alias] = generator;
    });
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

Generators.prototype.list = function () {
    return Object.keys(this.generators).join(', ');
};

module.exports = new Generators();
