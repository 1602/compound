# Views

## Templating engines

By default, CompoundJS uses `ejs`, but `jade` is also supported and can easily be enabled:

`environment/development.js`
```
app.set('view engine', 'jade')
```

`npmfile.js`
```
require('jade-ext');
```

## View rendering flow

Every controller action can call the `render` method to display its associated view. For example, the`index` action of the`users` controller will render the view `app/views/users/index.ejs`.

This view will be rendered within the layout specified using the `layout` call in the controller. By default, the layout name is the same as the controller name, in this case `app/views/layouts/users_layout.ejs`. If this layout file does not exists, the `application` layout used.

If you need to render a view without a layout, you can call `layout(false) `inside of the controller, this will skip layout rendering.

## Built-in helpers

### linkTo

```
linkTo('Users index', '/users');
// <a href="/users">Users index</a>
linkTo('Users index', '/users', { class: 'menu-item' });
// <a href="/users" class="menu-item">Users index</a>
linkTo('Users index', '/users', { remote: true });
// <a href="/users" data-remote="true">Users index</a>
```

* First argument is the link text
* Second argument is the link path / url
* Third argument is an object with additional link options

In the last example, the third argument is `{ remote: true }`, and as you can see it will add a `data-remote="true"` attribute to the `a` tag. Clicking on this link will send an asynchronous `GET` request to `/users`. The result will be executed as Javascript.

Here you can also specify a `jsonp` parameter to handle the response:

```
linkTo('Users index', '/users', { remote: true, jsonp: 'renderUsers' });
// <a href="/users" data-remote="true" data-jsonp="renderUsers">Users index</a>
```

The server will send you a json`{ users: [ {}, {}, {} ] }`, and this object will be passed as an argument to the `renderUsers` function:

```
renderUsers({users: [{},{},{}]});
```

You can also specify an anonymous function in the ` `jsonp param:

```
{ jsonp: '(function (url) { location.href = url; })' }
```

When server will send you `"http://google.com/"` following javascript will be evaluated:

```
(function (url) { location.href = url; })("http://google.com");
```

### formFor

Accepts two params: `resource`, `params` and returns a form helper with the following helper functions:

* `begin` - opening `&lt;form&gt;` tag
* `end` - closing `&lt;form&gt;` tag
* `input`
* `label`
* `textarea`
* `submit`
* `checkbox`

An example:

```
<% var form = formFor(user, { action: path_to.users }); %>
<%- form.begin() %>

<%- form.label('name', 'Username') %> <%- form.input('name') %>
<%- form.submit('Save') %>

<%- form.end() %>
```

This will generate:

```
<form action="/users/1" method="POST">
  <input type="hidden" name="_method" value="PUT" />
  <input type="hidden" name="authenticity_token" value="RANDOM_TOKEN" />
  <p>
    <label for="name">Username</label>
    <input id="name" name="name" value="Anatoliy" />
  </p>
  <p>
    <input type="submit" value="Save" />
  </p>        
</form>
```

### formTag

This is the "light" version of the `formFor` helper which expects only one argument: `params`. Use this helper when you don't have a resource, but still want to be able to use simple method overriding and csrf protection tokens.

An example:

```
<% var form = formTag({ action: path_to.users }); %>
<%- form.begin() %>

<%- form.label('name', 'Username') %> <%- form.input('name') %>
<%- form.submit('Save') %>

<%- form.end() %>
```

This will generate:

```
<form action="/users" method="POST">
  <input type="hidden" name="authenticity_token" value="RANDOM_TOKEN" />
  <p>
    <label for="name">Username</label>
    <input id="name" name="name" value="" />
  </p>
  <p>
    <input type="submit" value="Save" />
  </p>        
</form>
```

### input_tag / form.input

TODO: describe this

### label_tag / form.label

TODO: describe this

### stylesheet_link_tag

```
<%- stylesheetLinkTag('reset', 'style', 'mobile') %>
```

will generate

```
<link media="screen" rel="stylesheet" type="text/css" href="/stylesheets/reset.css?1306993455523" />
<link media="screen" rel="stylesheet" type="text/css" href="/stylesheets/style.css?1306993455523" />
```

Timestamps like  `?1306993455524` are added to assets only in development mode in order to prevent the browser from caching scripts and stylesheets

### javascript_link_tag

```
<%- javascript_include_tag(
  'https://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js',
  'rails', 'application') %>
  
```

will generate

```
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"></script> 
<script type="text/javascript" src="/javascripts/rails.js?1306993455524"></script> 
<script type="text/javascript" src="/javascripts/application.js?1306993455524"></script> 
```

Timestamps like  `?1306993455524` are added to assets only in development mode in order to prevent the browser from caching scripts and stylesheets

By default, CompoundJS expects assets to be located in `public/javascripts` and`public/stylesheets` directories, but this settings can be overwritten in `config/environment.js`:

```
app.set('jsDirectory', '/js/');
app.set('cssDirectory', '/css/');
```

## Defining your own helpers

You can define your own helpers for each controller in the file `app/helpers/_controllername__helpers.js`. For example, if you want to define a helper called `my_helper` to use it in the `users` controller, put the following in `app/helpers/users_controller.js`:

```
module.exports = {
  my_helper: function () {
    return "This is my helper!";
  }
}
```

The function `my_helper` can be now used by any of the views used by the `users` controller.

