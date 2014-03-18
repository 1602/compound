compound-routing(3) - compound map drawer
=========================================

## DESCRIPTION

The purpose of routes is to bind an URL to controller action.

## FILE

`config/routes.js` should export `routes(map)` function:

    exports.routes = function draw(map) {
        map.root('dashboard#home');
        map.namespace('admin', function(admin) {
            admin.resources('users');
        });
    };

## EVENT

The `routes` event can be used on compound object to define routes:

    compound.on('routes', function(map, compound) {
        map.get('auth', 'session#auth');
    });

It could be useful when you want to define some routes before application
initialization. When app initialized use `compound.map` object.

## BASIC ROUTING METHODS

To define routes we have map object which have number of methods:

* `get`:
  Define route for GET method.

* `post`:
  Define route for POST method.

* `put`:
  Define route for PUT method.

* `del`:
  Define route for DELETE method.

* `all`:
  Define route for all http methods.

All these methods have following signature:

    map.get(path, handler, middleware, options);

Params meaning:

* `path`:
  some path, which could contain params, see [ROUTE PATH PARAMS][]

* `handler`:
  string `controllerName#actionName`, see [ROUTE HANDLER][]

* `middleware`:
  function or array of functions (optional), see [MIDDLEWARE][]

* `options`:
  object containing params for route (optional), see [ROUTE OPTIONS][]

### ROUTE PATH PARAMS

Path may contain params - words started with colon ":". Parameter is optional
when param name followed by question mark "?". After matching request param
values populated `req.params` object.

### ROUTE HANDLER

Route handler is a string composed from `controllerName` and `actionName`
separated by `#` sign. When route nested inside resource `controllerName` could
be optional, in that case resource controller name assumed:

    map.resources('posts', function (post) {
        // map '/posts/destroyAll'
        // to {controller: 'posts', action: 'cleanup'}
        post.get('destroyAll', '#cleanup', {collection: true});
    });

Route handler could be skipped at all when route nested inside resource, then
actionName assumed to equals path:

    map.resources('posts', function (post) {
        // map '/posts/:post_id/commentsCount'
        // to {controller: 'posts', action: 'commentsCount'}
        post.get('commentsCount');
    });

### MIDDLEWARE

You may want to use middleware in routes. It's not recommended, but if you need
it you can put it as second argument:

    map.get('/admin', 'admin#index', authenticate);
    map.get('/protected/resource', 'resource#access', [middleware1, middleware2]);

### ROUTE OPTIONS

* `as`:
Specify custom URL helper name

    map.get('/some/action', 'some#action', {as: 'myAction'});
    pathTo.myAction() => '/some/action'

* `subdomain`:
Check HTTP/1.1 Host header when matching request, use \* as wildcard domain:

    map.get('/url', 'ctl#action', {subdomain: 'subdomain.tld'});
    map.get('/url', 'ctl#action', {subdomain: '*.example.com'});

A subdomain match will ignore the first- and second-level components of the
domain. This value is hard-coded into the `ControllerBridge` class.

*NOTE*: This feature relies on `Host` HTTP/1.1 header, if your Node process
behind a proxy (like Nginx), make sure you've passed this header to CompoundJS.

* `vhost`:
Constrains the route match to include the given virtual host name

    map.get('/apples/:id', 'fruit#action', {vhost: '.fruit.com'});
    map.get('/carrots/:id', 'vegetable#action', {vhost: 'vegetables.com'});

In the examples above, the `/apples/:id` route matches `http://fruit.com` and
`http://*.fruit.com`, while the `/carrots/:id` route will only match
`http://vegetables.com`.

Compared to the `subdomain` option, the `vhost` option allows for a more
straightforward route constraint on domain name.

*NOTE*: Like the `subdomain` feature, this relies on `Host` HTTP/1.1 header.

## URL HELPERS

URL helpers provide you convenient way to work with paths in your app. When you
define route:

    map.get('bunny', 'bunny#show');

you can use `pathTo.bunny` in your controllers and views, which will generate

    /bunny

path for you. You also can specify another helper name is you want using `as`
param:

    map.get('bunny', 'bunny#show', {as: 'rabbit'});

and now `pathTo.rabbit` available.

If your route has param, for example

    map.get('profile/:user', 'users#show');
    map.get('posts/:post_id/comments/:comment_id', 'comments#show');

URL helper will accept parameter (String), so that:

    pathTo.profile('Bugs_Bunny', 'users#show');
    > '/profile/Bugs_Bunny'
    pathTo.post_comment(2, 2383);
    > '/posts/2/comments/2383'

To learn how to get list of generated url helpers see [DEBUGGING][] section.


## ADVANCED ROUTING METHODS

### NAMESPACES

You may wish to organize groups of controllers under a namespace. The most common use-case is an administration area. All controllers within the `admin` namespace should be located inside the `app/controllers/` directory.

For example, let's create an admin namespace:

    map.namespace('admin', function (admin) {
        admin.resources('users');
    });

This routing rule will match with `/admin/users`, `/admin/users/new` and will create appropriate url helpers:

        admin_users GET    /admin/users.:format?          admin/users#index
        admin_users POST   /admin/users.:format?          admin/users#create
     new_admin_user GET    /admin/users/new.:format?      admin/users#new
    edit_admin_user GET    /admin/users/:id/edit.:format? admin/users#edit
         admin_user DELETE /admin/users/:id.:format?      admin/users#destroy
         admin_user PUT    /admin/users/:id.:format?      admin/users#update
         admin_user GET    /admin/users/:id.:format?      admin/users#show

### RESOURCES

Resource-based routing provides standard mapping between HTTP verbs and controller actions:

    map.resources('posts');

will provide the following routes:

      helper | method | path                   | controller#action
        posts GET      /posts                   posts#index
        posts POST     /posts                   posts#create
     new_post GET      /posts/new               posts#new
    edit_post GET      /posts/:id/edit          posts#edit
         post DELETE   /posts/:id               posts#destroy
         post PUT      /posts/:id               posts#update
         post GET      /posts/:id               posts#show.

To list all available routes you can run the command `compound routes`.

The first column of the table represents the `helper` - you can use this identifier in views and controllers to get the route. Some examples:

```
path_to.new_post            # /posts/new
path_to.edit_post(1)        # /posts/1/edit
path_to.edit_post(post)     # /posts/1/edit (in this example post = {id: 1})
path_to.posts               # /posts
path_to.post(post)          # /posts/1.

```

**OPTIONS**

If you want to override default routes behaviour, you can use two options: `as` and `path` to specify a helper name and a path you want to have in the result.

* `{ as: 'helperName' }`:
Path helper aliasing:

    map.resources('posts', { as: 'articles' });

This will create the following routes:

        articles GET    /posts.:format?          posts#index
        articles POST   /posts.:format?          posts#create
     new_article GET    /posts/new.:format?      posts#new
    edit_article GET    /posts/:id/edit.:format? posts#edit
         article DELETE /posts/:id.:format?      posts#destroy
         article PUT    /posts/:id.:format?      posts#update
         article GET    /posts/:id.:format?      posts#show.

* `{ path: 'alternatePath' }`:
If you want to change the base path:

    map.resources('posts', { path: 'articles' });

This will create the following routes:

        posts GET    /articles.:format?          posts#index
        posts POST   /articles.:format?          posts#create
     new_post GET    /articles/new.:format?      posts#new
    edit_post GET    /articles/:id/edit.:format? posts#edit
         post DELETE /articles/:id.:format?      posts#destroy
         post PUT    /articles/:id.:format?      posts#update
         post GET    /articles/:id.:format?      posts#show

* `Both "as" and "path" together`:

If you want to alias both the helper and the path:

    map.resources('posts', { path: 'articles', as: 'stories' });

This will create the following routes:

       stories GET    /articles.:format?          posts#index
       stories POST   /articles.:format?          posts#create
     new_story GET    /articles/new.:format?      posts#new
    edit_story GET    /articles/:id/edit.:format? posts#edit
         story DELETE /articles/:id.:format?      posts#destroy
         story PUT    /articles/:id.:format?      posts#update
         story GET    /articles/:id.:format?      posts#show

* `only`:
If you need routes only for several actions (e.g. `index`, `show`), you can specify the `only` option:

    map.resources('users', { only: ['index', 'show'] });

* `except`:
If you want to have all routes except a specific route, you can specify the `except` option:

    map.resources('users', { except: ['create', 'destroy'] });

**Nested resources**

Some resources may have nested sub-resources, for example `Post` has many `Comments`, and of course we want to get a post's comments using `GET /post/1/comments`.

Let's describe the route for our nested resource:

    map.resources('post', function (post) {
        post.resources('comments');
    });.

This routing map will provide the following routes:

    $ compound routes
         post_comments GET      /posts/:post_id/comments          comments#index
         post_comments POST     /posts/:post_id/comments          comments#create
      new_post_comment GET      /posts/:post_id/comments/new      comments#new
     edit_post_comment GET      /posts/:post_id/comments/:id/edit comments#edit
          post_comment DELETE   /posts/:post_id/comments/:id      comments#destroy
          post_comment PUT      /posts/:post_id/comments/:id      comments#update
          post_comment GET      /posts/:post_id/comments/:id      comments#show
                 posts GET      /posts                            posts#index
                 posts POST     /posts                            posts#create
              new_post GET      /posts/new                        posts#new
             edit_post GET      /posts/:id/edit                   posts#edit
                  post DELETE   /posts/:id                        posts#destroy
                  post PUT      /posts/:id                        posts#update
                  post GET      /posts/:id                        posts#show.

**Using url helpers for nested routes**

To use routes like `post_comments` you should call helper with param: parent resource or identifier before nested resource:

    path_to.post_comments(post)               # /posts/1/comments
    path_to.edit_post_comment(post, comment)  # /posts/1/comments/10/edit
    path_to.edit_post_comment(2, 300)         # /posts/2/comments/300/edit

**Custom actions in resourceful routes**

If you need some specific action to be added to your resource-based route, use this example:

    map.resource('users', function (user) {
        user.get('avatar', 'users#avatar');               // /users/:user_id/avatar
        user.get('top', 'users#top', {collection: true}); // /users/top
    });

## EXAMPLES

To link `GET /signup` with `new` action of `users` controller:

    map.get('signup', 'users#new');

The following route will link `GET /` to the `index` action of the`home` controller:

    map.root('home#index');

## DEBUGGING

To debug routes of your compound application you can use `compound routes`
command (or shortcut `compound r`). You can also specify optional argument for
filtering by helper name or method, for example:

    ~: ) compound r post
         posts GET    /posts.:format?          posts#index
         posts POST   /posts.:format?          posts#create
      new_post GET    /posts/new.:format?      posts#new
     edit_post GET    /posts/:id/edit.:format? posts#edit
          post DELETE /posts/:id.:format?      posts#destroy
          post PUT    /posts/:id.:format?      posts#update
          post GET    /posts/:id.:format?      posts#show
    ~: ) compound r GET
         posts GET    /posts.:format?          posts#index
      new_post GET    /posts/new.:format?      posts#new
     edit_post GET    /posts/:id/edit.:format? posts#edit
          post GET    /posts/:id.:format?      posts#show
    ~: ) compound r new
     new_post GET    /posts/new.:format? posts#new

## CONTRIBUTION

Compound use `railway-routes` npm package to provide routes functionality. If
you spotted an bug or have any suggestions or requests feel free to open issue
at
[github.com/1602/railway-routes](https://github.com/1602/railway-routes/issues)

## SEE ALSO

compound-tools(3) compound-tools(1) compound-controller(3)
