# Generators

CompoundJS generators are automated tools that allow you to create a bunch of files automatically. Each generator can be run via:

```
compound generate GENERATOR_NAME
```

or using the shortcut:

```
compound g GENERATOR_NAME
```

Built-in generators are: `model`, `controller`, `scaffold` (alias: `crud`)

## Generate model

Use case: You just need a model and schema.

Example:

```
compound g model user email password approved:boolean
```
Generated files:

```
exists  app/
exists  app/models/
create  app/models/user.js
patch   db/schema.js
```

The generated model file contains the following code:

```
module.exports = function (compound, User) {
  // define User here
};
```

The patched schema file contains the following code:

```
var User = describe('User', function () {
    property('email', String);
    property('password', String);
    property('approved', Boolean);
});
```

## Generate controller

Use case: You don't need a standard RESTful controller, just a few non-standard actions.

Example:

```
compound g controller controllername actionName otherActionName
```

Generated files:

```
exists  app/
exists  app/controllers/
create  app/controllers/controllername_controller.js
exists  app/helpers/
create  app/helpers/controllername_helper.js
exists  app/views/
create  app/views/controllername/
create  app/views/controllername/actionName.ejs
create  app/views/controllername/anotherActionName.ejs
```

The generated controller file contains the following code:

```
load('application');

action("actionName", function () {
    render();
});

action("anotherActionName", function () {
    render();
});
```

## Generate scaffold (crud)

The most commonly used generator. It creates a ready-to-use resource controller with all needed actions, views, schema definitions, routes and tests. Compound can also generate scaffolds in CoffeeScript.

Example call:

```
compound g scaffold post title content createdAt:date
exists  app/
exists  app/models/
create  app/models/post.js
exists  app/
exists  app/controllers/
create  app/controllers/posts_controller.js
exists  app/helpers/
create  app/helpers/posts_helper.js
create  app/views/layouts/posts_layout.ejs
create  public/stylesheets/scaffold.css
exists  app/views/
create  app/views/posts/
create  app/views/posts/_form.ejs
create  app/views/posts/new.ejs
create  app/views/posts/edit.ejs
create  app/views/posts/index.ejs
create  app/views/posts/show.ejs
patch   config/routes.js
```
