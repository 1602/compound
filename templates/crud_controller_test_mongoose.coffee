require('../test_helper.js').controller 'models', module.exports

sinon = require('sinon')

ValidAttributes = ->
    {
        VALID_ATTRIBUTES
    }

module.exports['models controller'] = {
    'GET new': (test) ->
        test.get '/models/new', ->
            test.assign 'title', 'New model'
            test.assign 'model'
            test.success()
            test.render 'new'
            test.render 'form.' + app.set('view engine')
            test.done()

    'GET index': (test) ->
        test.get '/models', ->
            test.success()
            test.render 'index'
            test.done()

    'GET edit': (test) ->
        find = Model.findById
        Model.findById = sinon.spy (id, cb) -> cb null, new Model

        test.get '/models/42/edit', ->
            test.ok Model.findById.calledWith('42')
            Model.findById = find
            test.success()
            test.render 'edit'
            test.done()

    'GET show': (test) ->
        find = Model.findById
        Model.findById = sinon.spy (id, cb) -> cb null, new Model

        test.get '/models/42', (req, res) ->
            test.ok Model.findById.calledWith('42')
            Model.findById = find
            test.success()
            test.render('show')
            test.done()

    'POST create': (test) ->
        model = new ValidAttributes
        oldSave = Model.prototype.save
        Model.prototype.save = (cb) -> cb null

        test.post '/models', model, () ->
            Model.prototype.save = oldSave
            test.redirect '/models'
            test.flash 'info'
            test.done()

    'POST create fail': (test) ->
        model = new ValidAttributes
        oldSave = Model.prototype.save
        Model.prototype.save = (cb) -> cb(new Error)

        test.post '/models', model, () ->
            Model.prototype.save = oldSave
            test.success()
            test.render('new')
            test.flash('error')
            test.done()

    'PUT update': (test) ->
        find = Model.findById
        Model.findById = sinon.spy (id, callback) ->
            test.equal id, 1
            callback null,
                id: 1
                save: (cb) -> cb(null)

        test.put '/models/1', new ValidAttributes, () ->
            Model.findById = find
            test.redirect '/models/1'
            test.flash 'info'
            test.done()

    'PUT update fail': (test) ->
        find = Model.findById
        Model.findById = sinon.spy (id, callback) ->
            test.equal id, 1
            callback null,
                id: 1
                save: (cb) -> cb new Error

        test.put '/models/1', new ValidAttributes, () ->
            Model.findById = find
            test.success()
            test.render 'edit'
            test.flash 'error'
            test.done()

    'DELETE destroy': (test) ->
        test.done()

    'DELETE destroy fail': (test) ->
        test.done()

}

