compound-controller(3) - controllers API
========================================

## DESCRIPTION

Controller is a module that receives http request and handles response.
Controller consists of a set of actions. Each action is called by the
request of a particular route.

## SYNOPSIS

Controller receives control from router, if more then one routes matched by
request - first route will be served, then second, third, etc..

It means that one request could be handled by one or more controllers matched by
router sequentially until one of controllers will produce output.

When no controllers produces output, then control returned to next middleware
after express.router.

## FILES

Controllers automatically loaded from `./app/controllers` directory.

Compound have two kind of controllers: when file name ended with `_controller`
this is **eval** controller, otherwise controller is **noeval**.

### EVAL CONTROLLERS

The purpose of eval controller - provide convenient interface with less code
and more expression. But it have price: harder debugging and lack of usual
features such as inheritance, meta-programming and using relative `require`.

By default compound generators create eval controllers, but this behavior will
be changed in future because eval is evil. See [USING EVAL CONTROLLERS][]
section for specific usage details.

Example of eval controller: `app/controllers/car_controller.js`:

    load('essentials'); // load parent controller

    before(function think() {
        // think for 1 second before acceperate
        setTimeout(function() {
            next();
        });
    }, {only: 'accelerate'});

    action('accelerate', function() {
        send(++this.speed);
    });

    action('brake', function() {
        send(--this.speed);
    });

### NOEVAL CONTROLLERS

The opposite way to do the same things as in eval controller: more verbose, a
little bit harder to read, but easier in debug. Works as usual class: allows
inheritance, meta-programming, using require and all regular features.

Example of noeval controller: `app/controllers/car.js`:

    module.exports = CarController;

    // load parent controller
    var Essentials = require('./essentials');

    function CarController(init) {
        // call parent constructor
        Essentials.call(this, init);

        init.before(function think(c) {
            // think for 1 second before accelerate
            setTimeout(function() {
                c.next();
            });
        }, {only: 'accelerate'});
    }

    // setup inheritance
    require('util').inherits(CarController, Essentials);

    CarController.prototype.accelerate = function(c) {
        c.send(++this.speed);
    };

    CarController.prototype.brake = function(c) {
        c.send(++this.speed);
    };

See [USING NOEVAL CONTROLLERS][] section for specific usage details.

### COMMON PARTS AND THE DIFFERENCE

Main difference between eval and noeval controllers: using controller context.
In case of eval it is possible just call controller context members as global
variables: next, req, res, send, render and other features. In noeval controller
each action and hook accepts context object as first argument, all context
features available on this object.

### USING EVAL CONTROLLERS

To define action call `action(name, fn) method. This method accepts 1 or 2
arguments. First argument (String name) is optional when named fn passed as
action handler.

To define hook just call `before` or `after` methods.

### USING NOEVAL CONTROLLERS

Noeval controller file should export constructor, actions are prototype methods
of that constructor. Controller constructor accepts `init` object which allows
to configure controller on creation.

To define hook call `before` or `after` on `init` object passed to constructor.

## MEMBERS

Controller context has the following set of members:

* `req`:
Request object (instance of http.IncomingMessage)

* `res`:
Response object (instance of http.ServerResponse)

* `body`:
Request body (null in case of GET)


## OUTPUT METHODS

**NOTE:** Each action should invoke exactly one output method (render, send).
This is the only requirement imposed by the asynchronous nature of Node.js. If
you don't call an output method, the client will infinitely wait for a server
response.

### render([view[, params]])

Render view and send result to client.

The `render` method accepts 0, 1 or 2 arguments. When called without any
arguments, it just renders the view associated with current action. For
example, this will render `app/views/posts/index.ejs`.

Fragment of `app/controllers/posts.js`:

    PostsController.prototype.index = function index(c) {
        c.render();
    });

To pass some data to the view, there are two ways to do it. The first is to
simply pass a hash containing the data:

Fragment of `app/controllers/posts.js`:

    PostsController.prototype.index = function index(c) {
        this.data = [];
        c.render({title: 'Posts index'});
    });

Example above will render 'posts/index' view passing `title` and `data` to it.

To render another view, just put its name as the first argument:

Fragment of `app/controllers/posts.js`:

    PostsController.prototype.update = function update(c) {
        this.title = 'Edit post';
        c.render('edit');
    };

### renderView(view[, callback])

Render view and return result to callback(err, html) or send to client when
callback is missing. This method does not accept params and works with
`viewContext` member of controller. Run `prepareViewContext` to create that
member.

### send(smth)

Send text, status code or json object to client

The `send` function is useful for debugging and one-page apps where you don't
want to render a heavy template and just want to send text or JSON data.

This function can be called with a status code number:

    Controller.prototype.destroy = function destroy(c) {
        // client will receive statusCode = 403 Forbidden
        c.send(403);
    });

or with a string:

    Controller.prototype.sayHello = function sayHello(c) {
        // client will receive 'Hello!'
        c.send('Hello!');
    });

or with an object:

    Controller.prototype.action = function action(c) {
        // client will receive '{"hello":"world"}'
        c.send({ hello: 'world' });
    });

### redirect(location)

Redirect client to specific location

This function just sets the status code and `Location` header, so the client
will be redirected to another location.

    redirect('/'); // root redirection
    redirect('http://example.com'); // redirect to another host

### header
Send header to client

### flash(type, message)
Display flash message

The `flash` function stores a message in the session to be displayed later.
Here are a few examples:

Fragment of `app/controllers/posts.js`:

    PostsController.prototype.create = function create(c) {
        c.Post.create(req.body, function (err) {
            if (err) {
                c.flash('error', 'Error while post creation');
                c.render('new', {post: req.body});
            } else {
                c.flash('info', 'Post has been successfully created');
                c.redirect(c.pathTo.posts);
            }
        });
    });

This `create` action sends a flash info on success and a flash error on fail.

## FLOW CONTROL METHODS

To provide the ability of DRY-ing controller code and reusing common code
parts, CompoundJS provides a few additional tools: method chaining and
external controllers loading.

### before([name, ]hook[, params])

Invoke `hook` before any action. Name param is optional when hook is named
function. Examples of params object:

    { only: ['actionName', 'actionName2'] }
    { except: 'anotherActionName' }

First configuration will run hook only for `actionName` and `actionName2`
actions.  Second configuration will run hook before each action except
`anotherActionName`.

To chain methods, you can use the `before` and `after` methods.

Fragment of `app/controllers/checkout.js`

    function CheckoutController(init) {
        init.before(userRequired, { only: 'order' });
        init.before(prepareBasket, { except: 'order' });
        init.before(loadProducts, { only: ['products', 'featuredProducts'] });
    }

    CheckoutController.prototype.products = function(c) { ... };
    CheckoutController.prototype.featuredProducts = function(c) { ... };
    CheckoutController.prototype.order = function(c) { ... };
    CheckoutController.prototype.basket = function(c) { ... };

    function userRequired(c) { c.next() }
    function prepareBasket(c) { c.next() }
    function loadProducts(c) { c.next() }

In this example, `userRequired` will be called only for the `order` action,
`prepareBasket` will be called for all actions except `order`, and
`loadProducts` will be called only for the `products` and
`featuredProducts`methods.

Note, that the before-functions should call the global `next` method that will
pass control to the next function in the chain.

### after([name, ]hook[, params])

Invoke `hook` after any action. Name param is optional when hook is named
function. Params object is the same as for before hook.

### skipBefore(name, params)

Skip before hook by it's name. Params object allows to specify skip/only
actions.

### skipAfter(name, params)

Skip after hook by it's name. Params object allows to specify skip/only
actions.

### next(err)

Go to next hook/action in chain. When error param passed to next rest of chain
skipped and error passed to error handling middleware.

### EVAL-ONLY METHODS

Eval have a bunch of shims to allow code sharing between controllers (noeval
doesn't need it, because it could use require and inheritance).

* `load`:
  Load another controller to use its methods.

* `use`:
  Get method defined in another controller, loaded using `load`.

* `publish`:
  Allow method to be used in other controller.

  Some methods, like `userRequired` for example, can be used in different
  controllers. To allow cross-controller code sharing, CompoundJS provides a few
  methods: `load`, `use` and `publish`.

  You can define `requireUser` in `application_controller.js` and call `publish`
  to make it accessible to all other controllers that inherit from this
  controller:
  
  Fragment of `app/controllers/application_controller.js`:

      publish('requireUser', requireUser);

      function requireUser () {
          // ...
      }

  Fragment of `app/controllers/products_controller.js`:

      load('application'); // note that _controller siffix omitted
      before(use('userRequired'), { only: 'products' });


### COMMON EXECUTION CONTEXT

There is one extra feature in flow control: All functions are invoked in the same context, so you can pass data between the functions using the `this` object:

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

## EXTENDING

To extend controller context use `compound.controllerExtensions` object. Methods
of that object will be mixed to each controller context.

For example, add method on initialization:

    compound.controllerExtensions.socketSend = function(arg) {
        socketIO.send(arg);
    };

Then it will be possible to call `socket('hello')` in eval controller, and
`c.socket('hello')` in noeval controller.

## CONTRIBUTION

Compound uses npm package [kontroller](http://npmjs.org/package/kontroller) to
handle controllers. Any patches, feature requests or bug reports are welcome to
its [github repository: 1602/kontroller](https://github.com/1602/kontroller).

## SEE ALSO

compound-views(3) compound-helpers(3)
