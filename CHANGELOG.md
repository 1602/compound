0.1.5

- Extension API
- Logger support (app.set('quiet', true) now forces logger to log in `log/ENV.log`
- Railway common API (almost all existing modules)
- Observers support

Observer is a kind of controller, that listen for some event in 
the system, for example: paypal, twitter or facebook observers 
listens for callback from foreign service. Email observer may 
listen some events related to emails.

If you need app.on('someEvent') you should place this code in
`APPROOT/app/observers/NAME_observer.js`

0.1.3

HTTPS Support
-------------

Just place your key and cert into config directory, railway will use it.
Default names for keys are `tsl.key` and `tsl.cert`, but you can store in in another place, in that case just pass filenames to createServer function:
`server.js`

    require('railway').createServer({key: '/tmp/key.pem', cert: '/tmp/cert.pem'});

0.1.2

 - npmfile
 - Extenstions
 - Support (partially) security tokens generation

0.1.1

 - Localization in `config/locales/*.yml`
 - Coffeescript support for models, controllers and initializers
 - Disable caching settings: `app.disable('model cache');` and `app.disable('eval cache');`

0.0.9

Scaffold generator `railway generate scaffold ModelName field1:type1 field2:type2`
It generates model, crud controller and appropriated views

0.0.8

Now you can run `railway init blog` and railway will create directory structure
within `blog` root folder

By default will created file `config/database.json` that will force you to use
mongoose driver, feel free to modify it and use redis or mysql (both supported)

Also, running `express -t ejs` no longer required

0.0.7
=====

Mongoose driver support

Describe your schema in `db/schema.js`, it's just commonjs module which should export
models. For describing logic please use `app/models/*.js` files. Every model
described in schema accessible as global object in all models and controllers.

0.0.6
=====

Added features generator for `cucumis`. Run `railway generate features`, then
you will be able to create `features` using Gherkin language, parsed by kyuri.

0.0.5
=====

  * CRUD generator
  * improved form_for helper
  * binary file bugfixes
  * layouts moved to `app/views/layouts`

0.0.4
=====

  * Rewritten controllers
  * Rewritten models
  * ORM for mysql, redis, works like datamapper (e.g. one entity -- one object)
