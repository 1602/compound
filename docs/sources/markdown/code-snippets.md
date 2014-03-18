# Code snippets

## Multiple workers compound server (node 0.8.16)

Example in CoffeeScript:

`server.coffee`
```
#!/usr/bin/env coffee

app = module.exports = (params) ->
  params = params || {}
  # specify current dir as default root of server
  params.root = params.root || __dirname
  return require('compound').createServer(params)

cluster = require('cluster')
numCPUs = require('os').cpus().length

if not module.parent
  port = process.env.PORT || 3000
  host = process.env.HOST || "0.0.0.0"
  server = app()
  if cluster.isMaster
    # Fork workers.
    cluster.fork() for i in [1..numCPUs]

    cluster.on 'exit', (worker, code, signal) ->
      console.log 'worker ' + worker.process.pid + ' died'
  else
    server.listen port, host, ->
      console.log(
        "Compound server listening on %s:%d within %s environment",
        host, port, server.set('env'))

```

## Redis session store for Heroku deployment with redistogo addon

Hook the `REDISTOGO_URL` environment variable in `config/environment.js` and pass it to the RedisStore constructor.
Example in CoffeeScript:

```

module.exports = (compound) ->

  express = require 'express'
  RedisStore = require('connect-redis')(express)
    
  if process.env['REDISTOGO_URL']
    url = require('url').parse(process.env['REDISTOGO_URL'])
    redisOpts =
      port: url.port
      host: url.hostname
      pass: url.auth.split(':')[1]
  else
    redisOpts = {}

  app.configure ->
    app.use compound.assetsCompiler.init()
    app.enable 'coffee'

    app.set 'cssEngine', 'stylus'

    app.use express.static(app.root + '/public', {maxAge: 86400000})
    app.use express.bodyParser()
    app.use express.cookieParser()
    app.use express.session secret: 'secret', store: new RedisStore(redisOpts)
    app.use express.methodOverride()
    app.use app.router

```

## Upload file to compound server

* <a href="http://groups.google.com/group/railwayjs/browse_thread/thread/592df72830898e9a" target="_blank">Discussion in Google Groups</a>
* The solution is to use <a href="https://github.com/anatoliychakkaev/connect-form-sync" target="_blank">this middleware</a>
* Check out this <a href="https://github.com/anatoliychakkaev/railway-example-upload" target="_blank">example app</a>

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
