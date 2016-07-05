
var fs = require('fs');
var path = require('path');
var sys = require('util');

var memfs = {}, writeFileSync, readFileSync, writeSync, closeSync, existsSync,
    mkdirSync, chmodSync, exit;


describe('Generators API', function() {

    var app, compound, args = ['--quiet'];

    before(function(done) {
        app = getApp();
        compound = app.compound;
        compound.generators.init(compound);
        // compound.generators.quiet = true;
        stubFS();
        compound.on('ready', function() {
            done();
        });
    });

    after(unstubFS);

    var output, puts;

    beforeEach(function() {
        output = [];
        puts = sys.puts;
        sys.puts = function(str) {
            output.push(str.replace(/\u001b\[\d+m/g, ''));
        };
    });

    afterEach(function() {
        sys.puts = puts;
    });

    it('should generate app', function () {
        compound.generators.perform('init', ['--stylus']);
        output.should.eql([
            'create  app/',
            'create  app/assets/',
            'create  app/assets/coffeescripts/',
            'create  app/assets/stylesheets/',
            'create  app/models/',
            'create  app/controllers/',
            'create  app/helpers/',
            'create  app/tools/',
            'create  app/views/',
            'create  app/views/layouts/',
            'create  db/',
            'create  db/seeds/',
            'create  db/seeds/development/',
            'create  log/',
            'create  public/',
            'create  public/images',
            'create  public/stylesheets/',
            'create  public/javascripts/',
            'create  node_modules/',
            'create  config/',
            'create  config/locales/',
            'create  config/initializers/',
            'create  config/environments/',
            'create  app/assets/coffeescripts/application.coffee',
            'create  app/assets/stylesheets/application.styl',
            'create  app/tools/database.js',
            'create  config/environment.js',
            'create  config/environments/development.js',
            'create  config/environments/production.js',
            'create  config/environments/test.js',
            'create  config/routes.js',
            'create  config/autoload.js',
            'create  db/schema.js',
            'create  public/index.html',
            'create  public/stylesheets/bootstrap.css',
            'create  public/stylesheets/bootstrap-responsive.css',
            'create  public/images/glyphicons-halflings-white.png',
            'create  public/images/glyphicons-halflings.png',
            'create  public/images/compound.png',
            'create  public/javascripts/rails.js',
            'create  public/javascripts/bootstrap.js',
            'create  public/javascripts/application.js',
            'create  public/favicon.ico',
            'create  Procfile',
            'create  README.md',
            'create  package.json',
            'create  server.js',
            'create  .gitignore',
            'create  config/database.js',
            'create  app/views/layouts/application_layout.ejs',
            'create  app/controllers/application_controller.js'
        ]);
    });

    it('should generate app', function () {
        var package = path.normalize(__dirname + '/../package.json');
        delete memfs[package];
        compound.generators.perform('init', ['--db', 'mongodb']);
        memfs[package].should.include('jugglingdb-mongodb');
    });
});

function stubFS() {
    exit = process.exit;
    writeFileSync = fs.writeFileSync;
    readFileSync = fs.readFileSync;
    closeSync = fs.closeSync;
    writeSync = fs.writeSync;
    existsSync = fs.existsSync;
    mkdirSync = fs.mkdirSync;
    chmodSync = fs.chmodSync;
    fs.mkdirSync = function (name) {
        memfs[name] = true;
    };
    fs.chmodSync = function () {};
    fs.writeFileSync = function (name, content) {
        memfs[name] = content;
        return name;
    };
    fs.existsSync = function (path) {
        return path in memfs;
    };
}

function unstubFS() {
    fs.writeFileSync = writeFileSync;
    fs.mkdirSync = mkdirSync;
    fs.chmodSync = chmodSync;
    fs.existsSync = existsSync;
    process.exit = exit;
}
