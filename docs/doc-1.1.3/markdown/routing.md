# Routing

The purpose of routes is to connect a URL with a controller action. For example, you can define the following route in `config/routes.js` to link `GET /signup` with `new` action of `users` controller:

```
map.get('signup', 'users#new');
```

The following route will link `GET /` to the `index` action of the`home` controller:

```
map.root('home#index');
```

## Resource-based routing

Resource-based routing provides standard mapping between HTTP verbs and controller actions:

```
map.resources('posts');
```

will provide the following routes:

```
  helper | method | path                   | controller#action
    posts GET      /posts                   posts#index
    posts POST     /posts                   posts#create
 new_post GET      /posts/new               posts#new
edit_post GET      /posts/:id/edit          posts#edit
     post DELETE   /posts/:id               posts#destroy
     post PUT      /posts/:id               posts#update
     post GET      /posts/:id               posts#show.
     
```

To list all available routes you can run the command `compound routes`.

The first column of the table represents the `helper` - you can use this identifier in views and controllers to get the route. Some examples:

```
path_to.new_post            # /posts/new
path_to.edit_post(1)        # /posts/1/edit
path_to.edit_post(post)     # /posts/1/edit (in this example post = {id: 1})
path_to.posts               # /posts
path_to.post(post)          # /posts/1.

```

## Aliases for resourceful routes

If you want to override default routes behaviour, you can use two options: `as` and `path` to specify a helper name and a path you want to have in the result.

### { as: 'helperName' }

Path helper aliasing:

```
map.resources('posts', { as: 'articles' });
```

This will create the following routes:

```
    articles GET    /posts.:format?          posts#index
    articles POST   /posts.:format?          posts#create
 new_article GET    /posts/new.:format?      posts#new
edit_article GET    /posts/:id/edit.:format? posts#edit
     article DELETE /posts/:id.:format?      posts#destroy
     article PUT    /posts/:id.:format?      posts#update
     article GET    /posts/:id.:format?      posts#show.
     
```

### { path: 'alternatePath' }

If you want to change the base path:

```
map.resources('posts', { path: 'articles' });
```

This will create the following routes:

```
    posts GET    /articles.:format?          posts#index
    posts POST   /articles.:format?          posts#create
 new_post GET    /articles/new.:format?      posts#new
edit_post GET    /articles/:id/edit.:format? posts#edit
     post DELETE /articles/:id.:format?      posts#destroy
     post PUT    /articles/:id.:format?      posts#update
     post GET    /articles/:id.:format?      posts#show
     
```

### All together

If you want to alias both the helper and the path:

```
map.resources('posts', { path: 'articles', as: 'stories' });
```

This will create the following routes:

```
   stories GET    /articles.:format?          posts#index
   stories POST   /articles.:format?          posts#create
 new_story GET    /articles/new.:format?      posts#new
edit_story GET    /articles/:id/edit.:format? posts#edit
     story DELETE /articles/:id.:format?      posts#destroy
     story PUT    /articles/:id.:format?      posts#update
     story GET    /articles/:id.:format?      posts#show
     
```

## Nested resources

Some resources may have nested sub-resources, for example `Post` has many `Comments`, and of course we want to get a post's comments using `GET /post/1/comments`.

Let's describe the route for our nested resource:

```
map.resources('post', function (post) {
  post.resources('comments');
});.
```

This routing map will provide the following routes:

```
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
              
```

### Using url helpers for nested routes

To use routes like `post_comments` you should call helper with param: parent resource or identifier before nested resource:

```
path_to.post_comments(post)               # /posts/1/comments
path_to.edit_post_comment(post, comment)  # /posts/1/comments/10/edit
path_to.edit_post_comment(2, 300)         # /posts/2/comments/300/edit
```

## Namespaces

You may wish to organize groups of controllers under a namespace. The most common use-case is an administration area. All controllers within the `admin` namespace should be located inside the `app/controllers/` directory.

For example, let's create an admin namespace:

```
map.namespace('admin', function (admin) {
  admin.resources('users');
});
```

This routing rule will match with `/admin/users`, `/admin/users/new` and will create appropriate url helpers:

```
    admin_users GET    /admin/users.:format?          admin/users#index
    admin_users POST   /admin/users.:format?          admin/users#create
 new_admin_user GET    /admin/users/new.:format?      admin/users#new
edit_admin_user GET    /admin/users/:id/edit.:format? admin/users#edit
     admin_user DELETE /admin/users/:id.:format?      admin/users#destroy
     admin_user PUT    /admin/users/:id.:format?      admin/users#update
     admin_user GET    /admin/users/:id.:format?      admin/users#show
     
```

## Restricting routes

If you need routes only for several actions (e.g. `index`, `show`), you can specify the `only` option:

```
map.resources('users', { only: ['index', 'show'] });
```

If you want to have all routes except a specific route, you can specify the `except` option:

```
map.resources('users', { except: ['create', 'destroy'] });
```

## Custom actions in resourceful routes

If you need some specific action to be added to your resource-based route, use this example:

```
map.resource('users', function (user) {
  user.get('avatar', 'users#avatar');
});
```

