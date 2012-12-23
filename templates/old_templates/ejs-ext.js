// monkey patch ejs
var ejs = require('ejs'), old_parse = ejs.parse;
ejs.parse = function () {
    var str = old_parse.apply(this, Array.prototype.slice.call(arguments));
    return str.replace('var buf = [];', 'var buf = []; arguments.callee.buf = buf;');
};

module.exports = ejs;
