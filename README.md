About [<img src="https://secure.travis-ci.org/1602/compound.png" />](http://travis-ci.org/#!/1602/compound) [![Code Climate](https://codeclimate.com/repos/550d7c5c69568077bd01488f/badges/e7b56f30b1a89120a1f5/gpa.svg)](https://codeclimate.com/repos/550d7c5c69568077bd01488f/feed)
=====

<img src="https://raw.github.com/1602/compound/master/templates/public/images/compound.png" />

CompoundJS - MVC framework for NodeJS&trade;. It allows you to build web application in minutes.

Compound modules now available at https://github.com/compoundjs

Full documentation is available at http://compoundjs.com/ and using man(1).

Installation
============

Option 1: npm

```sh
sudo npm install compound -g
```

Option 2: GitHub

```sh
sudo npm install 1602/compound
```

Usage
=====

```sh
# initialize app
compound init blog && cd blog
npm install

# generate scaffold
compound generate crud post title content published:boolean

# run server on port 3000
compound s 3000

# visit app
open http://localhost:3000/posts
```

Short functionality review
==========================

CLI tool
--------

```
$ compound help
Usage: compound command [argument(s)]

Commands:
  h,  help                     Display usage information
  i,  init                     Initialize compound app
  g,  generate [smth]          Generate something awesome
  r,  routes [filter]          Display application routes
  c,  console                  Debug console
  s,  server [port]            Run compound server
  install [module]             Installs a compound module and patches the autoload file
```

#### compound init [appname][ option(s)]

```
options:
  --coffee                 # Default: no coffee by default
  --tpl jade|ejs           # Default: ejs
  --css sass|less|stylus   # Default: stylus
  --db redis|mongodb|nano|mysql|sqlite3|postgres
                           # Default: memory
```

#### compound generate smth

smth = generator name (controller, model, scaffold, ...can be extended via plugins)

more information about generators available here:
http://compoundjs.github.com/generators

#### compound server 8000

equals to `PORT=8000 node server` - run server on port `8000`

#### compound console

run debugging console (see details below)

#### compound routes

print routes map (see details below)


Directory structure
-------------------

On initialization directories tree generated, like that:

```
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
|   |-- tools
|   |   `-- database.js
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
    |-- tls.cert
    `-- tls.key
```

HTTPS Support
-------------

Just place your key and cert into config directory, compound will use it.
Default names for keys are `tls.key` and `tls.cert`, but you can store in in another place, in that case just pass filenames to createServer function:
`server.js`

```js
require('compound').createServer({
    key: fs.readFileSync('/tmp/tls.key').toString(),
    cert: fs.readFileSync('/tmp/tls.cert').toString()
});
```

Few helpful commands:

```sh
# generate private key
openssl genrsa -out /tmp/tls.key
# generate cert
openssl req -new -x509 -key /tmp/tls.key  -out /tmp/tls.cert -days 1095 -batch
```

Routing
-------

Now we do not have to tediously describe REST routes for each resource, enough to write in `config/routes.js` code like this:

```js
exports.routes = function (map) {
    map.resources('posts', function (post) {
        post.resources('comments');
    });
};
```

instead of:

```js
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
```

and you can more finely tune the resources to specify certain actions, middleware, and other. Here are example routes for [my blog][1]:

```js
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
```

since version 0.2.0, it is possible to use generic routes:

```js
exports.routes = function (map) {
    map.get(':controller/:action/:id');
    map.all(':controller/:action');
};
```

if you have `custom_controller` with `test` action inside it you can now do:

```
GET /custom/test
POST /custom/test
GET /custom/test/1 // also sets params.id to 1
```

for debugging routes described in `config/routes.js` you can use `compound routes` command:

```
$ compound routes
               GET    /                               posts#index
               GET    /:id                            posts#show
   sitemap.txt GET    /sitemap.txt                    posts#map
    adminPosts GET    /admin/posts.:format?           admin/posts#index
    adminPosts POST   /admin/posts.:format?           admin/posts#create
  newAdminPost GET    /admin/posts/new.:format?       admin/posts#new
 editAdminPost GET    /admin/posts/:id/edit.:format?  admin/posts#edit
     adminPost DELETE /admin/posts/:id.:format?       admin/posts#destroy
     adminPost PUT    /admin/posts/:id.:format?       admin/posts#update
likesAdminPost PUT    /admin/posts/:id/likes.:format? admin/posts#likes
```

Filter by method:

```
$ compound routes GET
               GET    /                               posts#index
               GET    /:id                            posts#show
   sitemap.txt GET    /sitemap.txt                    posts#map
    adminPosts GET    /admin/posts.:format?           admin/posts#index
  newAdminPost GET    /admin/posts/new.:format?       admin/posts#new
 editAdminPost GET    /admin/posts/:id/edit.:format?  admin/posts#edit
```

Filter by helper name:

```
$ compound routes Admin
  newAdminPost GET    /admin/posts/new.:format?       admin/posts#new
 editAdminPost GET    /admin/posts/:id/edit.:format?  admin/posts#edit
likesAdminPost PUT    /admin/posts/:id/likes.:format? admin/posts#likes
```


Helpers
-------

In addition to regular helpers `linkTo`, `formFor`, `javascriptIncludeTag`, `formFor`, etc. there are also helpers for routing: each route generates a helper method that can be invoked in a view:

```html
<%- link_to("New post", newAdminPost) %>
<%- link_to("New post", editAdminPost(post)) %>
```

generates output:

```html
<a href="/admin/posts/new">New post</a>
<a href="/admin/posts/10/edit">New post</a>
```

Controllers
-----------

The controller is a module containing the declaration of actions such as this:

```js
beforeFilter(loadPost, {only: ['edit', 'update', 'destroy']});

action('index', function () {
    Post.allInstances({order: 'created_at'}, function (collection) {
        render({ posts: collection });
    });
});

action('create', function () {
    Post.create(req.body, function () {
        redirect(pathTo.adminPosts);
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
        redirect(pathTo.adminPosts);
    });
});

function loadPost () {
    Post.find(req.params.id, function () {
        request.post = this;
        next();
    });
}
```

## Generators ##

Compound offers several built-in generators: for a model, controller and for
initialization. Can be invoked as follows:

```js
compound generate [what] [params]
```

`what` can be `model`, `controller` or `scaffold`. Example of controller generation:

```
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
```

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

```sh
compound console
```

or its shortcut

```sh
compound c
```

It's just simple node-js console with some Compound bindings, e.g. models. Just one note
about working with console: Node.js is asynchronous by its nature, and it's great
but it made console debugging much more complicated, because you should use callbacks
to fetch results from the database, for example. I have added one useful method to
simplify async debugging using compound console. It's named `c`. You can pass it
as a parameter to any function requiring callbacks, and it will store parameters passed
to the callback as variables `_0, _1, ..., _N` where N is index in `arguments`.

Example:

```
$ compound c
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
```

Localization
------------

To add another language to app just create a .yml file in `config/locales`,
for example `config/locales/jp.yml`, copy contents of `config/locales/en.yml` to new
file and rename root node (`en` to `jp` in that case), also in `lang` section rename
`name` to Japanese (for example).

Next step - rename email files in `app/views/emails`, copy all files `*.en.html`
and `*.en.text` to `*.jp.html` and `*.jp.text` and translate new files.

NOTE: translation can contain `%` symbol(s), that means variable substitution

If you don't need locales support you can turn it off in `config/environment`:

```js
app.set('i18n', 'off');
```

Logger
-----

```js
app.set('quiet', true); // force logger to log into `log/#{app.settings.env}.log`
compound.logger.write(msg); // to log message
```

setup custom log dir:

```javascript
app.get('log dir', '/var/log/compound-app/');
```

Configuring
===========

Compound has some configuration options allows to customize app behavior

eval cache
----------

Enable controller caching, should be turned on in prod. In development mode,
disabling the cache allows the avoidance of server restarts after each model/controller change.

```js
app.disable('eval cache'); // in config/environments/development.js
app.enable('eval cache'); // in config/environments/production.js
```

model cache
-----------

Same option for models. When disabled, model files evaluated per each request.

```js
app.disable('model cache'); // in config/environments/development.js
```

view cache
----------

Express.js option, enables view caching.

```js
app.disable('view cache'); // in config/environments/development.js
```

quiet
-----

Write logs to `log/NODE_ENV.log`

```js
app.set('quiet', true); // in config/environments/test.js
```

merge javascripts
-----------------

Join all javascript files listed in `javascript_include_tag` into one

```js
app.enable('merge javascripts'); // in config/environments/production.js
```

merge stylesheets
-----------------

Join all stylesheet files listed in `stylesheets_include_tag` into one

```js
app.enable('merge stylesheets'); // in config/environments/production.js
```

## Custom tools

Put your function to ./app/tools/toolname.js to be able to run it within application
environment as `compound toolname` command via CLI. See example tool in generated
example: ./app/tools/dabatase.js

Optionally you can specify some usage information on your function to be able to see
it in list of available commands (using `compound` command).

```javascript
module.exports.help = {
    shortcut:    'db',
    usage:       'db [migrate|update]',
    description: 'Migrate or update database(s)'
};
```


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


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/1602/compound/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

