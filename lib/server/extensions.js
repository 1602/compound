var utils = require('../utils'),
    Module = require('module').Module,
    fs = require('fs'),
    cs = require('coffee-script'),
    path = require('path');

/**
 * Initialize extensions
 */
module.exports = function(root) {
    var root = root || this.root;

    var autoload = path.join(root, 'config', 'autoload');
    if (utils.existsSync(autoload + '.js') ||
        utils.existsSync(autoload + '.coffee')
    ) {
        var exts = require(autoload);
        init(exts(this), this);
    }

    function init(exts, c) {
        if (exts && exts.forEach) {
            exts.forEach(function (e) {
                if (e.init) {
                    e.init(c);
                }
            });
        }
    }

};

