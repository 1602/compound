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
