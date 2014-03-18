# Asset Compiler

## Included Compilers

* coffee (default for js)
* less
* sass
* stylus (default for css)

## Basic Usage

Environment Settings:

in `/config/environment.js`
use the AssetCompiler middleware to set your css engine

```
...
app.configure(function(){
  app.use(compound.assetsCompiler.init());
  ...
  app.set('cssEngine', 'stylus');
  ...
});
...
```
This will compile stylus files (or whatever else you use as your css engine) in
`/app/assets/stylesheets` into `/public/stylesheets` and `/app/assets/coffeescripts` into `/public/javascripts`

## Configuration

Configuration can be done either in an initializer or in the Environment file.

Compilers should be configured using the `compound.assetCompiler.config(compilerName, options)` method.
This method takes two parameters, the name of the compiler and an object containing the options to configure, 
and returns `compound.assetCompiler` for chaining. The default compilers use the following options:

* render: a function to compile the source into js or css (see Adding Your Own Compiler for more details)
* sourceExtension: `'coffee'`
* destExtension: `'js'`
* sourceDir: `''` or `'/coffeescripts'`
* destDir: `''` or `'/javascripts'`

It may also contain any other options which can be accessed in the render function ( `this.myCustomOption` )

Configure the coffee compiler to look for coffee files in `assets/coffee` instead of `/assets/coffeescripts`:

`/config/environment.js`

```
...
app.configure(function(){
  app.use(compound.assetsCompiler.configure('coffee', {
    sourceDir: '/coffee'
  }).init());
  ...
});
...
```

## Compiler Specific Configuration

### Stylus:
When using stylus you may want to use some custom configurations as described here: http://learnboost.github.com/stylus/docs/js.html

`/config/environment.js`

```
...
app.configure(function(){
  app.use(compound.assetsCompiler.configure('stylus', {
    use: function(stylus) {
      stylus.use(mylib);
      stylus.define('families', ['Helvetica Neue', 'Helvetica', 'sans-serif']);
      stylus.import(path);
      stylus.include(path);
    }
  }).init());
  ...
});
...
```


## Adding Your Own Compiler

Adding your own compiler can be done using `compound.assetCompiler.add(compilerName, options)`

Options should contain the following:
* render: a function to compile the source into js or css (see Adding Your Own Compiler for more details)
* sourceExtension: `'coffee'`
* destExtension: `'js'`
* sourceDir: `''` or `'/coffeescripts'`
* destDir: `''` or `'/javascripts'`
* any other options your render function needs

The render function takes three arguments:

1. src, a string containing the source of the file to be compiled
2. options: sourceDir, destDir, sourceFileName, destFileName.  Shouldn't be necassary in most cases
3. callback: pass two arguments, error and the compiled source.


An example of how to add your own coffee compiler:

`/config/environment.js`

```
...
app.configure(function(){
  app.use(compound.assetsCompiler.add('coffee', {
    render: function(str, options, fn) {
      try {
        fn(null, this.coffee.compile(str));
      } catch (err) {
        fn(err);
      }
    },
    coffee: require('coffee-script'),
    sourceDir: '/coffeescripts',
    destDir: '/javascripts',
    sourceExtension: 'coffee',
    destExtension: 'js'
  }).init());
  ...
});
...
```
