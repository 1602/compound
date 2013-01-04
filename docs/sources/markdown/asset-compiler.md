# Asset Compiler

## Included Compilers

* coffee (default for js)
* less
* sass
* less (default for css)

## Basic Usage

Environment Settings:

in `/config/environment.js`
use the AssetCompiler middleware and set you css engine

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
This will compile stylus (or whatever you use as you css engine) files in
`/app/assets/stylesheets` into `/public/stylesheets` and `/app/assets/coffeescripts` into `/public/javascripts`

## Configuration

Configuration can be done either in an initializer or in the Environment file.

Compilers should be configured using the `compound.assetCompiler.config(compilerName, options)` method.
This method takes 2 params, the name of the compiler and an obje t containing the options to configure, 
and returns `compound.assetCompiler` for chaining. the default compilers use the following options:

* render: a function to compile the source into js or css, see Adding Your Own Compiler for more details
* sourceExtension: `'coffee'`
* destExtension: `'js'`
* sourceDir: `''` or `'/coffeescripts'`
* destDir: `''` or `'/javascripts'`

It may also contain any other options which can be accessed in the render function ( `this.myCustomOption` )

configure the coffe compiler to look for coffe files in `assets/coffee` instead of `/assets/coffeescripts`:

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

### stylus:
when using stylus you may want to use some custom configurations as described here: http://learnboost.github.com/stylus/docs/js.html

`/config/environment.js`

```
...
app.configure(function(){
  app.use(compound.assetsCompiler.configure('stylus', {
    use: function(style) {
      style.use(mylib);
      style.define('families', ['Helvetica Neue', 'Helvetica', 'sans-serif']);
      style.import(path);
      style.include(path);
    }
  }).init());
  ...
});
...
```


## Adding Your Own Compiler

Adding your own comiler can be done using `compound.assetCompiler.add(compilerName, options)`

options should contain the following:
* render: a function to compile the source into js or css, see Adding Your Own Compiler for more details
* sourceExtension: `'coffee'`
* destExtension: `'js'`
* sourceDir: `''` or `'/coffeescripts'`
* destDir: `''` or `'/javascripts'`
* any other options your render function needs

The render function takes the 3 arguments:

1. src, a string containing the source of the file to be compiled
2. options: sourceDir, destDir, sourceFileName, destFileName.  shouldn't be necassary in most cases
3. callback: pass 2 arguements, error and the compiled source.


an example of how to add your own coffee compiler:

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
