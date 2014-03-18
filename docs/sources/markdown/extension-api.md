# Compound API

This chapter describes internal API of compound application. Compound app designed
as npm module that can be used as part of other modules.

Main entry point called `server.js` exports function for creating application.
This function returns regular express application with one addition: `compound`
object. This is object we are talking about. It contains some information about
application, such as root directory path, MVC structure, models. Read this
chapter to get familiar with this powerful tool.

## Compound app

Let's start with the entry point, called `server.js` by default. If you want to
rename it, update package.json with `"main": "server.js"` line. The purpose of that
file: publish function that  creates application. This function can create many
instances of application which could be configured and used separately:

```javascript
// load package
var instantiateApp = require('.');

// create different instances
var app1 = instantiateApp();
var app2 = instantiateApp(params);

// run on different ports/hosts
app1.listen(3000);
app2.listen(3001, '10.0.0.2', callback);
```

Instantiation method accepts optional hash of params. These params hash will be
passed to express.

### Tools

The `compound.tools` hash contains commands that can be invoked using the command line, for example `compound routes` will call `compound.tools.routes()` .

To write a tool, just add another method to the `compound.tools` object, the method name will become the command name:

```
compound.tools.database = function () {
    switch (compound.args.shift()) {
    case 'clean':
        // clean db
        break;
    case 'backup':
        // backup db
        break;
    case 'restore':
        // restore db
        break;
    default:
        console.log('Usage: compound database [clean|backup|restore]');
    }
};
```

Then the following commands will be available:

```
compound database
compound database backup
compound database clean
compound database restore
```

If you want to see this command when using `compound help`you can provide some information about the tool using the `help`hash:

```
compound.tools.db.help = {
    shortcut: 'db',
    usage: 'database [backup|restore|clean]',
    description: 'Some database features'
};
```

The next time you call `compound`, you will see:

```
Commands:
  ...
  db, database [backup|restore|clean]  Some database features
  
```

If you defined a shortcut, it can be used instead of the full command name:

```
compound db clean
```

To learn more, please check out [the sources](https://github.com/1602/compound/blob/master/lib/tools.js "the sources"): `lib/tools.js`

### Generators

Coming soon. It's about the `compound.generators` module and the `compound generate` commands.

### Structure

Coming soon. This chapter about compound.structure api, overwriting internals of
compound app without touching source code.

# Extensions

Any npm package can be used as an extension for CompoundJS. If it should be
loaded at compound app startup, it should export `init` method. This method will
receive single argument: compound app.

Compound will initialize each extension listed in `config/autoload.js` file.
Example of file generated on `compound init` command:

```
module.exports = function(compound) {
    return [
        require('ejs-ext'),
        require('jugglingdb'),
        require('seedjs')
    ];
};
```

We are trying to keep compound core tiny, some parts of framework now moved to
separate modules:

- railway-routes
- jugglingdb
- kontroller
- seedjs

Some of the modules still loaded from core, but in future everything will be
moved to `config/autoload`. It means that every part of compound can be replaced
with another module that should follow common API.

