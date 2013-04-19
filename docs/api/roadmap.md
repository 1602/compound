compound-roadmap(3) -- Major things to do in upcoming releases
==============================================================

## DOCS

* `man`:
  Move to man. Rewrite all docs. Write new sections for events and compound api.

* `web`:
  Publish docs on compoundjs.com.

* `guides`:
  Transform current docs into guides + manual pages.

## CLIENT-SIDE

* `multi-modular`:
  Client-side apps could be composed as it's done in express+compound now:

      app.use(route, anotherApp);

* `configuration`:
  Allow client-side app configuration: blacklist/whitelist controllers/models.

* `angular` and `components`:
  Think about using angular or maybe other frameworks. TJ's
  [components](http://tjholowaychuk.com/post/27984551477/components) look
  decent. Investigate.



## MISC

* `test`:
  Write tests for core components or remove components from core to
  another packages. Make 86% - 90% coverage.

* `mocha`:
  Port existing tests to mocha. Including generated tests for crud controllers.

* `helpers`:
  - Reorganize helpers. Now we have 1000 lines of code, which is not okay.
  - Nested fieldsets using fieldsFor

* `optimize loading`:
  It takes about 300 - 500ms to load compound app. It's time to improve loading
  process.
