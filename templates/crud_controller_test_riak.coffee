require('../test_helper.js').controller 'models', module.exports

sinon = require('sinon')

ValidAttributes = ->
    {
        VALID_ATTRIBUTES
    }

module.exports['models controller'] = {
    'GET new': (test) ->
        test.get '/models/new', (req, res) ->
            test.assign 'title', 'New model'
            test.assign 'model'
            test.success()
            test.render 'new'
            test.render 'form.' + app.set('view engine')
            test.done()

    'GET index': (test) ->
        test.get '/models', (req, res) ->
            test.success()
            test.render 'index'
            test.done()

    'GET edit': (test) ->
        Model.findById = sinon.spy (key, callback) =>
            test.strictEqual key, '42'
            model = new Model ValidAttributes
            model.id = '42'
            callback null, model

        test.get '/models/42/edit', (req, res) ->
            test.success()
            test.render 'edit'
            test.done()

    'GET show': (test) ->
        Model.findById = sinon.spy (key, callback) =>
            test.strictEqual key, '42'
            model = new Model ValidAttributes
            model.id = '42'
            callback null, model

        test.get '/models/42', (req, res) ->
            test.success()
            test.render('show')
            test.done()

    'POST create': (test) ->
        Model.create = sinon.spy (data, callback) ->
            test.deepEqual data, new ValidAttributes
            model = new Model data
            callback null, model

        test.post '/models', new ValidAttributes, (req, res) ->
            test.redirect '/models'
            test.flash 'info'
            test.done()

    'POST create fail': (test) ->
        Model.create = sinon.spy (data, callback) ->
            test.deepEqual data, new ValidAttributes
            model = new Model data
            callback true, model

        test.post '/models', new ValidAttributes, (req, res) ->
            test.success()
            test.render('new')
            test.flash('error')
            test.done()

    'PUT update': (test) ->
        Model.findById = sinon.spy (key, callback) =>
            test.strictEqual key, '42'
            model = new Model ValidAttributes
            model.id = '42'
            model.save = sinon.spy (data, callback) ->
                test.notStrictEqual model.Id, '42'
                callback null, model
            callback null, model

        test.put '/models/42', new ValidAttributes, (req, res) ->
            test.redirect '/models/42'
            test.flash 'info'
            test.done()

    'PUT update fail': (test) ->
        Model.findById = sinon.spy (key, callback) ->
            test.strictEqual key, '42'
            model = new Model ValidAttributes
            model.id = '42'
            model.save = sinon.spy (data, callback) ->
                callback true, model
            callback null, model

        test.put '/models/42', new ValidAttributes, (req, res) ->
            test.success()
            test.render 'edit'
            test.flash 'error'
            test.done()

    'DELETE destroy': (test) ->
        Model.findById = sinon.spy (key, callback) ->
            test.strictEqual key, '42'
            model = new Model ValidAttributes
            model.id = '42'
            model.destroy = sinon.spy (callback) ->
                callback null, true
            callback null, model

        test.del '/models/42', {}, (req, res) ->
            test.send('/models')
            test.flash 'info'
            test.done()

    'DELETE destroy fail': (test) ->
        Model.findById = sinon.spy (key, callback) ->
            test.strictEqual key, '42'
            model = new Model ValidAttributes
            model.id = '42'
            model.destroy = sinon.spy (callback) ->
                callback true, false
            callback null, model

        test.del '/models/42', {}, (req, res) ->
            test.send('/models')
            test.flash 'error'
            test.done()
}