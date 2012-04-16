require('./spec_helper').init(exports);

var fs = require('fs');
var path = require('path');
var memfs = {};
fs.mkdirSync = function (name) {
    memfs[name] = true;
};
fs.chmodSync = function () {};
var writeFileSync = fs.writeFileSync;
var mkdirSync = fs.mkdirSync;
var readFileSync = fs.readFileSync;
var closeSync = fs.closeSync;
var writeSync = fs.writeSync;
fs.writeFileSync = function (name, content) {
    memfs[name] = content;
    return name;
};
fs.readFileSync = function (name) {
    return memfs[name] || readFileSync(name);
};
path.existsSync = function (path) {
    return !!memfs[path];
};
railway.utils.appendToFile = function (name, content) {
};
var exit = process.exit;

it('should generate app', function (test) {
    global.args = ['--stylus'];
    process.exit = test.done;
    railway.generators.perform('init', args);
});

it('should generate model', function (test) {
    global.args = 'post title content'.split(' ');
    railway.generators.perform('model', args);
    test.done();
});

it('should generate controller', function (test) {
    global.args = 'cars index show new create edit update'.split(' ');
    railway.generators.perform('controller', args);
    test.done();
});

it('should generate scaffold', function (test) {
    global.args = 'book author title'.split(' ');
    railway.generators.perform('crud', args);
    test.done();
});

it('should generate features', function (test) {
    global.args = [];
    railway.generators.perform('features', args);
    test.done();
});

it('relax', function (test) {
    fs.writeFileSync = writeFileSync;
    fs.mkdirSync = mkdirSync;
    fs.readFileSync = readFileSync;
    process.exit = exit;
    test.done();
});

