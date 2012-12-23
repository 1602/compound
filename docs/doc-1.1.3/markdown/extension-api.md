# Extensions API

Any npm package can be used as an extension for CompoundJS. Just add a line to `npmfile.js`, for example:

```
require('railway-twitter');
```

Just one note: If the package has an `init` method, it will be invoked after application initialization.

For an example, you can check out the [twitter-auth extension](https://github.com/1602/compound-twitter "twitter-auth extension") for compound.

### Installation script

If your extensions have an `install.js` script in the root directory, itw ill be invoked after installing it using `compound install`.

### CompoundJS extension API

All CompoundJS modules are published in the `compound`object. Any module can be extended or monkey-patched. Let's take a look at the most common use-cases.

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

### Discussion in Google Groups

API is still in development now, feel free to leave comments about it in the related [Google Groups thread](http://groups.google.com/group/railwayjs/browse_thread/thread/1cfa3e1e348fc62c "Google Groups thread").