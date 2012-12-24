# Controllers

In CompoundJS, a controller is a module that receives user input and initiates a response. Controllers consists of a set of actions. Each action is called by the request of a particular route. To define an action, you should use the reserved global function `action`.

## Features overview

Inside controller you can use following reserved global functions to control response:

* <strong>render</strong> - render view template related to this action
* <strong>send</strong> - send text, status code or json object to client
* <strong>redirect</strong> - redirect client to specific location
* <strong>header</strong> - send header to client
* <strong>flash</strong> - display flash message

And here is a bunch of functions to control execution flow:

* <strong>before</strong> - invoke this method before any action
* <strong>after</strong> - invoke this method after any action
* <strong>load</strong> - load another controller to use its methods
* <strong>use</strong> or <strong>export</strong> - get method defined in another controller, loaded using `load`
* <strong>publish</strong> or <strong>import</strong> - allow method to be used in other controller

Let's learn more about each of this functions

## Response control

<strong>NOTE: Each action should invoke exactly one output method. This is the only requirement imposed by the asynchronous nature of Node.js. If you don't call an output method, the client will infinitely wait for a server response.</strong>

### render()

The `render` method accepts 0, 1 or 2 arguments. When called without any arguments, it just renders the view associated with this action. For example, this will render `app/views/posts/index.ejs`.

`posts_controller.js`
```
action('index', function () {
  render();
});
```

If you want to pass some data to the view, there are two ways to do it. First is to simply pass a hash containing the data:

```
action('index', function () {
  render({ title: "Posts index" });
});
```

and the second method is to set the properties of `this`:

```
action('index', function () {
  this.title = "Posts index";
  render();
});
```

And if you want to render another view, just put its name as the first argument:

```
action('update', function () {
  this.title = "Update post";
  render('edit');
});
```

or:

```
action('update', function () {
  render('edit', { title: "Update post" });
});
```

### send()

The `send` function is useful for debugging and one-page apps where you don't want to render a heavy template and just want to send text or JSON data.

This function can be called with number (status code):

```
action('destroy', function () {
  send(403); // client will receive statusCode = 403 Forbidden
});
```

or with a string:

```
action('sayHello', function () {
  send('Hello!'); // client will receive 'Hello!'
});
```

or with object:

```
action('apiCall', function () {
  send({ hello: 'world' }); // client will receive '{"hello":"world"}'
});
```

### redirect()

This function just sets the status code and `Location` header, so the client will be redirected to another location.

```
redirect('/'); // root redirection
redirect('http://example.com'); // redirect to another host
```

### flash()

The `flash` function stores a message in the session for future displaying, this is a regular expressjs function, refer to [expressjs guide](http://expressjs.com/guide.html#req.flash() "expressjs guide") to learn how it works. Few examples:

`posts_controller.js`
```
action('create', function () {
    Post.create(req.body, function (err) {
        if (err) {
            flash('error', 'Error while post creation');
            render('new', {post: req.body});
        } else {
            flash('info', 'Post has been successfully created');
            redirect(path_to.posts);
        }
    });
});
```

This `create` action sends a flash info on success and a flash error on fail.

## Execution flow control

To provide the ability of DRY-ing controller code and reusing common code parts, CompoundJS provides a few additional tools: method chaining and external controllers loading.

To chain methods, you can use the `before` and`after` methods.

`checkout_controller.js`
```
before(userRequired, { only: 'order' });
before(prepareBasket, { except: 'order' });
before(loadProducts, { only: ['products', 'featuredProducts'] });

action('products', function () { ... });
action('featuredProducts', function () { ... });
action('order', function () { ... });
action('basket', function () { ... });

function userRequired () { next() }
function prepareBasket () { next() }
function loadProducts () { next() }
```

In this example, `userRequired` will be called only for the`order` action, `prepareBasket` will be called for all actions except `order`, and `loadProducts` will be called only for the `products` and `featuredProducts`methods.

Note, that the before-functions should call the global `next` method that will pass control to the next function in the chain.

## Common execution context

There is one extra feature in flow control: All functions are invoked in the same context, so you can pass data between the functions using the `this` object:

```
function loadProducts () {
    Product.find(function (err, prds) {
        this.products = prds;
        next();
    }.bind(this));
}

action('products', function () {
    assert.ok(this.products, 'Products available here');
    render(); // also products will available in view
});
```

## Sharing code across controllers

Some methods, like `userRequired` for example, can be used in different controllers. To allow cross-controller code sharing, CompoundJS provides a few methods: `load`, `use` and `publish`.

You can define `requireUser` in `application_controller.js` and call `publish` to make it accessible to all other controllers that inherit from this controller:

`application_controller.js`
```
publish('requireUser', requireUser);

function requireUser () {
  // ...
}
```

`products_controller.js`
```
load('application'); // note that _controller siffix omitted
before(use('userRequired'), { only: 'products' });
```

## Other express.js features

To get familiar with CompoundJS controllers, look at a few examples available at github: [coffee controller](https://github.com/anatoliychakkaev/railwayjs.com/blob/master/app/controllers/pages_controller.coffee "coffee controller"), [javascript controller](https://github.com/1602/router/blob/master/app/controllers/users_controller.js "javascript controller").

All other expressjs features have no global shortcuts yet, but they can still be used since `request` (alias  `req`) and `response` (alias `res`) are available as global variables inside the controller context. In the view context, they are available as `request` and `response`.

