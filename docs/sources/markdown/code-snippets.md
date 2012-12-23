# Code snippets

## Multiple workers compound server (node 0.6.0)

Example in CoffeeScript:

`server.coffee`
```
#!/usr/bin/env coffee

app = module.exports = require('compoundjs').createServer()

cluster = require('cluster')
numCPUs = require('os').cpus().length

port = process.env.PORT or 3000

if not module.parent
    if cluster.isMaster
        # Fork workers.
        cluster.fork() for i in [1..numCPUs]
        
        cluster.on 'death', (worker) ->
            console.log 'worker ' + worker.pid + ' died'
    else
        # Run server
        app.listen port
        console.log "CompoundJS server listening on port %d within %s environment", port, app.settings.env
        
```

## Redis session store for Heroku deployment with redistogo addon

Hook the `REDISTOGO_URL` environment variable in `config/environment.js` and pass it to the RedisStore constructor.

```
var express    = require('express'),
    RedisStore = require('connect-redis')(express);
    
var redisOpts;
if (process.env['REDISTOGO_URL']) {
    var url = require('url').parse(process.env['REDISTOGO_URL']);
    var redisOpts = {
        port: url.port,
        host: url.hostname,
        pass: url.auth.split(':')[1]
    };
} else {
    redisOpts = {};
}

app.configure(function(){
    var cwd = process.cwd();
    app.use(express.static(cwd + '/public', {maxAge: 86400000}));
    app.set('views', cwd + '/app/views');
    app.set('view engine', 'ejs');
    app.set('jsDirectory', '/javascripts/');
    app.set('cssDirectory', '/css/');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secret', store: new RedisStore(redisOpts)}));
    app.use(express.methodOverride());
    app.use(app.router);
});
```

## Upload file to compound server

* <a href="http://groups.google.com/group/railwayjs/browse_thread/thread/592df72830898e9a" target="_blank">Discussion in Google Groups</a>
* The solution is to use <a href="https://github.com/anatoliychakkaev/connect-form-sync" target="_blank">this middleware</a>
* Check out <a href="https://github.com/anatoliychakkaev/railway-example-upload" target="_blank">example app</a>

```
var form = require('connect-form-sync');
app.configure(function(){
    ....
    app.use(form({ keepExtensions: true }));
    app.use(express.bodyParser());
    ....
});
```

And use it in the controller like that:

```
action('create', function () {
    this.file = new File();
    var tmpFile = req.form.files.file;
    this.file.upload(tmpFile.name, tmpFile.path, function (err) {
        if (err) {
            console.log(err);
            this.title = 'New file';
            flash('error', 'File can not be created');
            render('new');
        } else {
            flash('info', 'File created');
            redirect(path_to.files);
        }
    }.bind(this));
});
```
