About [<img src="https://secure.travis-ci.org/1602/compound.png" />](http://travis-ci.org/#!/1602/compound)
=====

<img
src="https://raw.github.com/1602/compound/master/templates/public/images/compound.png" />

CompoundJS - MVC framework for NodeJS&trade;. It allows you to build web application in minutes.

Installation
============

Option 1: npm

    $ sudo npm install compound -g

Option 2: GitHub

    $ sudo npm install 1602/compound

Usage
=====

    # initialize app
    $ compound init blog && cd blog
    $ npm install -l

    # generate scaffold
    $ compound generate crud post title content published:boolean

    # run server on port 3000
    $ compound s 3000

    # visit app
    $ open http://localhost:3000/posts

Using client-side framework
===========================

Experimental feature. Allows to work transparently on client and server (same codebase working on clientside).
Install additional prerequisites:

    $ npm install railway-routes browserify

Uncomment following configuration line in `config/environment.js`:

    app.enable('clientside');

Run app

    node .

Make sure you've included `public/javascripts/compound.js` in your layout.

Short functionality review
==========================

CLI tool
--------

    Usage: compound command [argument(s)]

    Commands:
      h,  help                     Display usage information
      i,  init                     Initialize compound app
      g,  generate [smth]          Generate something awesome
      r,  routes [filter]          Display application routes
      c,  console                  Debug console
      s,  server [port]            Run compound server
      x,  install gitUrl [extName] Install compound eXtension

#### compound init [appname][ key(s)]
    keys:
    --coffee                 # Default: no coffee by default
    --tpl jade|ejs           # Default: ejs
    --css sass|less|stylus   # Default: stylus
    --db redis|mongodb|nano|mysql|sqlite3|postgres
                             # Default: memory

#### compound generate smth - smth = generator name (controller, model, scaffold, ...can be extended via plugins)

##### builtin generator: model

    compound g model user email password approved:boolean # generate User model with fields user, password: String, approved: Boolean
    compound g post title content --coffee # generate Post model in coffee script syntax

##### builtin generator: scaffold (crud)

    compound g scaffold todo title done:boolean --coffee # generate scaffold for Todo model (title: String, done: Boolean)

##### builtin generator: controller
    compound g controller sessions new create destroy # generate sessions controller with actions and views
    
#### compound server 8000 or **PORT=8000 node server** - run server on port `8000`

#### compound console - run debugging console (see details below)

#### compound routes - print routes map (see details below)


Directory structure
-------------------

On initialization directories tree generated, like that:

    .
    |-- app
    |   |-- assets
    |   |   |-- coffeescripts
    |   |   |   `-- application.coffee
    |   |   `-- stylesheets
    |   |       `-- application.styl
    |   |-- controllers
    |   |   |-- admin
    |   |   |   |-- categories_controller.js
    |   |   |   |-- posts_controller.js
    |   |   |   `-- tags_controller.js
    |   |   |-- comments_controller.js
    |   |   `-- posts_controller.js
    |   |-- models
    |   |   |-- category.js
    |   |   |-- post.js
    |   |   `-- tag.js
    |   |-- views
    |   |   |-- admin
    |   |   |   `-- posts
    |   |   |       |-- edit.ejs
    |   |   |       |-- index.ejs
    |   |   |       |-- new.ejs
    |   |   |-- layouts
    |   |   |   `-- application_layout.ejs
    |   |   |-- partials
    |   |   `-- posts
    |   |       |-- index.ejs
    |   |       `-- show.ejs
    |   `-- helpers
    |       |-- admin
    |       |   |-- posts_helper.js
    |       |   `-- tags_helper.js
    |       `-- posts_helper.js
    `-- config
        |-- database.json
        |-- routes.js
        |-- tsl.cert
        `-- tsl.key

HTTPS Support
-------------

Just place your key and cert into config directory, compound will use it.
Default names for keys are `tsl.key` and `tsl.cert`, but you can store in in another place, in that case just pass filenames to createServer function:
`server.js`

    require('compound').createServer({key: '/tmp/key.pem', cert: '/tmp/cert.pem'});

Few helpful commands:

    # generate private key
    openssl genrsa -out config/tsl.key
    # generate cert
    openssl req -new -x509 -key config/tsl.key  -out config/tsl.cert -days 1095 -batch

Routing
-------

Now we do not have to tediously describe REST rotes for each resource, enough to write in `config/routes.js` code like this:

    exports.routes = function (map) {
        map.resources('posts', function (post) {
            post.resources('comments');
        });
    };

instead of:

    var ctl = require('./lib/posts_controller.js');
    app.get('/posts/new.:format?', ctl.new);
    app.get('/posts.:format?', ctl.index);
    app.post('/posts.:format?', ctl.create);
    app.get('/posts/:id.:format?', ctl.show);
    app.put('/posts/:id.:format?', ctl.update);
    app.delete('/posts/:id.:format?', ctl.destroy);
    app.get('/posts/:id/edit.:format?', ctl.edit);

    var com_ctl = require('./lib/comments_controller.js');
    app.get('/posts/:post_id/comments/new.:format?', com_ctl.new);
    app.get('/posts/:post_id/comments.:format?', com_ctl.index);
    app.post('/posts/:post_id/comments.:format?', com_ctl.create);
    app.get('/posts/:post_id/comments/:id.:format?', com_ctl.show);
    app.put('/posts/:post_id/comments/:id.:format?', com_ctl.update);
    app.delete('/posts/:post_id/comments/:id.:format?', com_ctl.destroy);
    app.get('/posts/:post_id/comments/:id/edit.:format?', com_ctl.edit);

and you can more finely tune the resources to specify certain actions, middleware, and other. Here example routes of [my blog][1]:

    exports.routes = function (map) {
        map.get('/', 'posts#index');
        map.get(':id', 'posts#show');
        map.get('sitemap.txt', 'posts#map');
    
        map.namespace('admin', function (admin) {
            admin.resources('posts', {middleware: basic_auth, except: ['show']}, function (post) {
                post.resources('comments');
                post.get('likes', 'posts#likes')
            });
        });
    };

since version 0.2.0 it is possible to use generic routes:

    exports.routes = function (map) {
        map.get(':controller/:action/:id');
        map.all(':controller/:action');
    };

if you have `custom_controller` with `test` action inside it you can now do:

    GET /custom/test
    POST /custom/test
    GET /custom/test/1 // also sets params.id to 1

for debugging routes described in `config/routes.js` you can use `compound routes` command:

    $ compound routes
                     GET    /                               posts#index
                     GET    /:id                            posts#show
         sitemap.txt GET    /sitemap.txt                    posts#map
         admin_posts GET    /admin/posts.:format?           admin/posts#index
         admin_posts POST   /admin/posts.:format?           admin/posts#create
      new_admin_post GET    /admin/posts/new.:format?       admin/posts#new
     edit_admin_post GET    /admin/posts/:id/edit.:format?  admin/posts#edit
          admin_post DELETE /admin/posts/:id.:format?       admin/posts#destroy
          admin_post PUT    /admin/posts/:id.:format?       admin/posts#update
    likes_admin_post PUT    /admin/posts/:id/likes.:format? admin/posts#likes

Filter by method:

    $ compound routes GET
                     GET    /                               posts#index
                     GET    /:id                            posts#show
         sitemap.txt GET    /sitemap.txt                    posts#map
         admin_posts GET    /admin/posts.:format?           admin/posts#index
      new_admin_post GET    /admin/posts/new.:format?       admin/posts#new
     edit_admin_post GET    /admin/posts/:id/edit.:format?  admin/posts#edit

Filter by helper name:

    $ compound routes _admin
      new_admin_post GET    /admin/posts/new.:format?       admin/posts#new
     edit_admin_post GET    /admin/posts/:id/edit.:format?  admin/posts#edit
    likes_admin_post PUT    /admin/posts/:id/likes.:format? admin/posts#likes


Helpers
-------

In addition to regular rails helpers `link_to`, `form_for`, `javascript_include_tag`, `form_for`, etc. there are also helpers for routing: each route generates a helper method that can be invoked in a view:

    <%- link_to("New post", new_admin_post) %>
    <%- link_to("New post", edit_admin_post(post)) %>

generates output:

    <a href="/admin/posts/new">New post</a>
    <a href="/admin/posts/10/edit">New post</a>

Controllers
-----------

The controller is a module containing the declaration of actions such as this:

    beforeFilter(loadPost, {only: ['edit', 'update', 'destroy']});

    action('index', function () {
        Post.allInstances({order: 'created_at'}, function (collection) {
            render({ posts: collection });
        });
    });

    action('create', function () {
        Post.create(req.body, function () {
            redirect(path_to.admin_posts);
        });
    });

    action('new', function () {
        render({ post: new Post });
    });

    action('edit', function () {
        render({ post: request.post });
    });

    action('update', function () {
        request.post.save(req.locale, req.body, function () {
            redirect(path_to.admin_posts);
        });
    });

    function loadPost () {
        Post.find(req.params.id, function () {
            request.post = this;
            next();
        });
    }

## Generators ##

Compound offers several built-in generators: for a model, controller and for
initialization. Can be invoked as follows:

    compound generate [what] [params]

`what` can be `model`, `controller` or `scaffold`. Example of controller generation:

    $ compound generate controller admin/posts index new edit update
    exists  app/
    exists  app/controllers/
    create  app/controllers/admin/
    create  app/controllers/admin/posts_controller.js
    create  app/helpers/
    create  app/helpers/admin/
    create  app/helpers/admin/posts_helper.js
    exists  app/views/
    create  app/views/admin/
    create  app/views/admin/posts/
    create  app/views/admin/posts/index.ejs
    create  app/views/admin/posts/new.ejs
    create  app/views/admin/posts/edit.ejs
    create  app/views/admin/posts/update.ejs

Currently it generates only `*.ejs` views

Models
------

Checkout [JugglingDB][2] docs to see how to work with models.

CompoundJS Event model
----------------------

Compound application loading process supports following events to be attached
(in chronological order):

1. configure
2. after configure
3. routes
4. extensions
5. after extensions
6. structure
7. models
8. initializers

REPL console
------------

To run REPL console use command

    compound console

or it's shortcut

    compound c

It just simple node-js console with some Compound bindings, e.g. models. Just one note
about working with console. Node.js is asynchronous by its nature, and it's great
but it made console debugging much more complicated, because you should use callback
to fetch result from database, for example. I have added one useful method to
simplify async debugging using compound console. It's name `c`, you can pass it
as parameter to any function requires callback, and it will store parameters passed
to callback to variables `_0, _1, ..., _N` where N is index in `arguments`.

Example:

    compound c
    compound> User.find(53, c)
    Callback called with 2 arguments:
    _0 = null
    _1 = [object Object]
    compound> _1
    { email: [Getter/Setter],
      password: [Getter/Setter],
      activationCode: [Getter/Setter],
      activated: [Getter/Setter],
      forcePassChange: [Getter/Setter],
      isAdmin: [Getter/Setter],
      id: [Getter/Setter] }

Localization
------------

To add another language to app just create yml file in `config/locales`,
for example `config/locales/jp.yml`, copy contents of `config/locales/en.yml` to new
file and rename root node (`en` to `jp` in that case), also in `lang` section rename
`name` to Japanese (for example).

Next step - rename email files in `app/views/emails`, copy all files `*.en.html` 
and `*.en.text` to `*.jp.html` and `*.jp.text` and translate new files.

NOTE: translation can contain `%` symbol(s), that means variable substitution

If you don't need locales support you can turn it off in `config/environment`:

    app.set('i18n', 'off');

Logger
-----

    app.set('quiet', true); // force logger to log into `log/#{app.settings.env}.log`
    compound.logger.write(msg); // to log message

Configuring
===========

Compound has some configuration options allows to customize app behavior

eval cache
----------

Enable controllers caching, should be turned on in prd. In development mode
disabling cache allows to avoid server restarting after each model/controller change

    app.disable('eval cache'); // in config/environments/development.js
    app.enable('eval cache'); // in config/environments/production.js

model cache
-----------

Same option for models. When disabled model files evaluated per each request.

    app.disable('model cache'); // in config/environments/development.js

view cache
----------

Express.js option, enables view caching.

    app.disable('view cache'); // in config/environments/development.js

quiet
-----

Write logs to `log/NODE_ENV.log`

    app.set('quiet', true); // in config/environments/test.js

merge javascripts
-----------------

Join all javascript files listed in `javascript_include_tag` into one

    app.enable('merge javascripts'); // in config/environments/production.js

merge stylesheets
-----------------

Join all stylesheet files listed in `stylesheets_include_tag` into one

    app.enable('merge stylesheets'); // in config/environments/production.js

MIT License
===========

    Copyright (C) 2011 by Anatoliy Chakkaev <mail [åt] anatoliy [døt] in>

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

  [1]: http://anatoliy.in
  [2]: https://github.com/1602/jugglingdb
