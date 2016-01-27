compound-changelog(3) -- Changes in CompoundJS
================================

## HISTORY

### 1.1.19

- Fixed HTTPS support
- Introduce `req.locals` API to early access controller action context (`this`).
- compound.loadConfigs(dir) for loading configs from entire directory into
  compound.app.settings
- Added `vhost` route option.
- Added presenters
- Controllers now support promises

### 1.1.6

* **man**:
  Docs in roff (man). Change `compound help` command to proxy request to `man`.
  Unfortunately compound have optional `ronn` rubygem dependency.

* **inject middleware**:
  New API for middleware injections.

* **mocha**:
  All tests rewritten. Mocha is new default test engine.

* **cleanup core**:
  Generators, assets compiler, clientside moved to separate packages. Refactor
  and speedup render.

* **new helpers**:
  icon, imageTag, metaTag, anchor, contentFor, button.

* **async initializers**:
  Initializer may accept second optional param: `Function done`. In that case
  next initializer will be called only when `done` callback called.

* **compound.model() api**:
   - compound.model('modelname') - getter (case insensitive)
   - compound.model('ModelName', true) - case sensitive getter
   - compound.model(NamedFn) - setter for model as named fn (or jugglingdb model)

### 1.1.5

* **generators**:
  New generators structure. Fully rewritten by Sascha Gehlich.

* **noeval controllers**:
  Finally we have correct controllers with inheritance, proper require, debug
  and meta-programming. Added predefined meta-controllers.

* **clientside compound**:
  A lot of restructuring and rewriting for clienside, separate server and client
  loading logic.

* **miscellaneous**:
  Fixes in i18n, helpers, logging, docs, etc..

### 1.1.4

* **config/autoload**:
  No more weird npmfile with `require` problems.

* **domain**:
  Basic middleware to support nodejs domains.

* **any view engine**:
  Now any express-friendly templating engine supported.

* **block-less helpers**:
  View helpers formTag, formFor and fieldsFor doesn require blocks.

* **bugs**:
  A lot of bugfixes after rewriting

### 1.1.3

* **railwayjs renamed**:
  Major API changes started at this point. No backwards compatibility with
  RailwayJS.

* **compoundjs.com**:
  Static website generated from markdown added to repository

* **assets compiler**:
  Now built-in core. Allows to generate css/js from assets stored in app/assets
  directory

* **express v3**:
  Switch to latest express

* **Events API**:
  Improved loading process, now utilizes events API based on nodejs event emitter

## SEE ALSO

[compound-railway-changelog(3)](railway-changelog.3.html)
