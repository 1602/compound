# Models

By default models managed using [JugglingDB
ORM](https://github.com/1602/jugglingdb), but you can use any ORM you like. For
example, if you prefer [mongoose](http://mongoosejs.com), check [mongoose on
compound](https://github.com/anatoliychakkaev/mongoose-compound-example-app) example app.

## Setup DB: config/database.js

Describe which database adapter you are going to use and how to connect with the database in `config/database.js` (`.coffee`, `.json` and `.yml` are also supported):

```
module.exports = {
  development:
  { driver:   "redis"
  , host:     "localhost"
  , port:     6379
  }
, test:
  { driver:   "memory"
  }
, staging:
  { driver:   "mongodb"
  , url:      "mongodb://localhost/test"
  }
, "production":
  { driver:   "mysql"
  , host:     "localhost"
  , post:     3306
  , database: "nodeapp-production"
  , username: "nodeapp-prod"
  , password: "t0ps3cr3t"
  }
}
```

Checkout the list of available adapters [here](http://github.com/1602/jugglingdb "here"). You can also specify the the adapter in the `schema` file using the`schema` method:

```
schema 'redis', url: process.env.REDISTOGO_URL, ->
    define 'User'
    # other definitions for redis schema

schema 'mongodb', url: process.env.MONGOHQ_URL, ->
    define 'Post'
    # other definitions for mongoose schema

```

All of these schemas can be used simultaneously and you can even describe relations between different schemas, for example `User.hasMany(Post)`

## Define schema: db/schema.js

Use `define` to describe database entities and `property` to specify types of fields. This method accepts the following arguments:

* Name of property
* Property type: Date, Number, Boolean, Text, String (default)
* Property options: Object `{ default: 'default value', index: 'true' }`

JavaScript:

`db/schema.js`
```
var Person = define('Person', function () {
    property('email', { index: true });
    property('active', Boolean, { default: true });
    property('createdAt', Date);
});

var Book = define('Book', function () {
    property('title');
    property('ISBN');
});
```

CoffeeScript:

`db/schema.coffee`
```
Person = define 'Person', ->
    property 'email', index: true
    property 'active', Boolean, default: true
    property 'createdAt', Date, default: Date
    property 'bio', Text
    property 'name'
    
Book = define 'Book', ->
    property 'title'
    property 'ISBN'
    
```

or define a <strong>custom schema</strong> (non-juggling), fo example <strong>mongoose</strong>. Please note that in case of a custom schema, JugglingDB features will not work.

```
customSchema(function () {
    var mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost/test');
    
    var Schema = mongoose.Schema, ObjectId = Schema.ObjectId;
    
    var BlogPost = new Schema({
        author    : ObjectId
        , title     : String
        , body      : String
        , date      : Date
    });
    
    var Post = mongoose.model('BlogPost', BlogPost);
    Post.modelName = 'BlogPost'; // this is for some features inside compound (helpers, etc)
    
    module.exports['BlogPost'] = Post;
});
```

## Implement: app/models/name

### Describe models

Models should be described in `app/models/modelname.js` files. Each model file
should export function, which accepts two arguments:

```
module.exports = function(compound, ModelName) {

  ModelName.classMethod = function classMethod() {
    return 'hello from class method';
  };

  ModelName.prototype.instanceMethod = function instanceMethod() {
    return 'hello from instance method';
  };
};
```

If you need initialize database-independent model in model file, disregard
second param of exported function, use this example:

```
module.exports = function(compound) {
  // define class
  function MyModel() {
    this.prop = '';
  }

  MyModel.prototype.method = function() {};

  // register model in compound
  compound.models.MyModel = MyModel;

  // optionally specify modelname (used in view helpers)
  MyModel.className = 'MyModel';
};
```

### Describe relations

Currently, only a few relations are supported: `hasMany`and `belongsTo`

```
User.hasMany(Post,   {as: 'posts',  foreignKey: 'userId'});
// creates instance methods:
// user.posts(conds)
// user.posts.build(data) // like new Post({userId: user.id});
// user.posts.create(data) // build and save
// user.posts.find

Post.belongsTo(User, {as: 'author', foreignKey: 'userId'});
// creates instance methods:
// post.author(callback) -- getter when called with function
// post.author() -- sync getter when called without params
// post.author(user) -- setter when called with object
```

It's also possible to use scopes inside hasMany associations, for example if you have a scope for `Post`:

```
Post.scope('published', { published: true });
```

&nbsp;Which is just a shortcut for the `all` method:

```
Post.published(cb); // same as Post.all({ published: true });
```

So you can use it with an association:

```
user.posts.published(cb); // same as Post.all({ published: true, userId: user.id });
```

### Setup validations

Validations invoked after `create`, `save` and `updateAttributes` can also be skipped when using `save`:

```
obj.save({ validate: false });
```

Validations can be called manually by calling `isValid()` on the object.

After the validations are called, the validated object contains an `errors` hash containing error message arrays:

```
{
    email: [
        'can\'t be blank',
        'format is invalid'
    ],
    password: [ 'too short' ]
}
```

If you want your validations to raise exceptions, just call `save` like this:

```
obj.save({ throws: save });
```

To define a validation, call its configurator on your model's class:

```
Person.validatesPresenceOf('email', 'name');
Person.validatesLengthOf('password', { min: 5 });
```

Each configurator accepts a set of string arguments and an optional last argument representing the settings for the validation. Here are some common options:

* `if`
* `unless`
* `message`
* `allowNull`
* `allowBlank`

`if` and `unless` can be strings or functions returning a boolean that defines whether a validation is being called. The functions are invoked in the resource context which means that you can access the resource properties using `this.propertyName`.

`message` allows you to define an error message that is being displayed when the validation fails.

## Available validators

### length

```
User.validatesLengthOf 'password', min: 3, max: 10, allowNull: true
User.validatesLengthOf 'state', is: 2, allowBlank: true
user = new User validAttributes

user.password = 'qw'
test.ok not user.isValid(), 'Invalid: too short'
test.equal user.errors.password[0], 'too short'

user.password = '12345678901'
test.ok not user.isValid(), 'Invalid: too long'
test.equal user.errors.password[0], 'too long'

user.password = 'hello'
test.ok user.isValid(), 'Valid with value'
test.ok not user.errors

user.password = null
test.ok user.isValid(), 'Valid without value'
test.ok not user.errors

user.state = 'Texas'
test.ok not user.isValid(), 'Invalid state'
test.equal user.errors.state[0], 'length is wrong'

user.state = 'TX'
test.ok user.isValid(), 'Valid with value of state'
test.ok not user.errors
```

### numericality

```
User.validatesNumericalityOf 'age', int: true
user = new User validAttributes

user.age = '26'
test.ok not user.isValid(), 'User is not valid: not a number'
test.equal user.errors.age[0], 'is not a number'

user.age = 26.1
test.ok not user.isValid(), 'User is not valid: not integer'
test.equal user.errors.age[0], 'is not an integer'

user.age = 26
test.ok user.isValid(), 'User valid: integer age'
test.ok not user.errors
```

### inclusion

```
User.validatesInclusionOf 'gender', in: ['male', 'female']
user = new User validAttributes

user.gender = 'any'
test.ok not user.isValid()
test.equal user.errors.gender[0], 'is not included in the list'

user.gender = 'female'
test.ok user.isValid()

user.gender = 'male'
test.ok user.isValid()

user.gender = 'man'
test.ok not user.isValid()
test.equal user.errors.gender[0], 'is not included in the list'
```

### exclusion

```
User.validatesExclusionOf 'domain', in: ['www', 'admin']
user = new User validAttributes

user.domain = 'www'
test.ok not user.isValid()
test.equal user.errors.domain[0], 'is reserved'

user.domain = 'my'
test.ok user.isValid()
```

### format

```
User.validatesFormatOf 'email', with: /^([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})$/i
user = new User validAttributes

user.email = 'invalid email'
test.ok not user.isValid()

user.email = 'valid@email.tld'
test.ok user.isValid()
```

## Models reloading

In development env models automatically reloaded on file changing. If you don't
need this behavior and prefer restart webserver you can turn off this setting in
`config/environments/development.js`:

    app.disable('watch');

It also disables controllers reloading.
