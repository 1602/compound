require('./spec_helper').init(exports);

var fs = require('fs');
var path = require('path');
var memfs = {};
var mkdirSync = fs.mkdirSync;
var chmodSync = fs.chmodSync;
fs.mkdirSync = function (name) {
    memfs[name] = true;
};
fs.chmodSync = function () {};
var writeFileSync = fs.writeFileSync;
var readFileSync = fs.readFileSync;
var closeSync = fs.closeSync;
var writeSync = fs.writeSync;
fs.writeFileSync = function (name, content) {
    memfs[name] = content;
    return name;
};
path.existsSync = function (path) {
    return !!memfs[path];
};
compound.utils.appendToFile = function (name, content) {
};
var exit = process.exit;

it('should generate app', function (test) {
    updArgs(['--stylus']);
    process.exit = test.done;
    compound.generators.perform('init', args);
    test.done();
});

it('should generate model', function (test) {
    fs.readFileSync = function (name) {
        return memfs[name] || readFileSync(name);
    };
    updArgs('post title content'.split(' '));
    compound.generators.perform('model', args);
    fs.readFileSync = readFileSync;
    test.done();
});

it('should generate controller', function (test) {
    updArgs('cars index show new create edit update'.split(' '));
    compound.generators.perform('controller', args);
    test.done();
});

it('should generate scaffold', function (test) {
    fs.readFileSync = function (name) {
        return memfs[name] || readFileSync(name);
    };
    updArgs('book author title'.split(' '));
    compound.generators.perform('crud', args);
    fs.readFileSync = readFileSync;
    test.done();
});

it('should generate features', function (test) {
    updArgs([]);
    compound.generators.perform('features', args);
    test.done();
});

it('relax', function (test) {
    fs.writeFileSync = writeFileSync;
    fs.mkdirSync = mkdirSync;
    fs.chmodSync = chmodSync;
    process.exit = exit;
    test.done();
});

function updArgs(a) {
    while(global.args.pop());
    var k;
    while(k=a.shift())global.args.push(k);
}

