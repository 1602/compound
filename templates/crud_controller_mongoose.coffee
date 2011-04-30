before ->
    Item.findById req.params.id, (err, item) ->
        if err or not item
            redirect path_to.items
        else
            req.item = item
            next()
    , only: ['show', 'edit', 'update', 'destroy']

# GET /models/new
action 'new', ->
    model = new Model
    render
        model: model,
        title: 'New model'

# POST /models
action 'create', ->
    req.model = new Model
    FILTER_PROPERTIES.forEach (field) ->
        req.model[field] = req.body[field] if req.body[field]?

    req.model.save (errors) ->
        if errors
            flash 'error', 'Model can not be created'
            render 'new',
                model: req.model
                title: 'New model'
        else
            flash 'info', 'Model created'
            redirect path_to.models

# GET /models
action 'index', ->
    Model.find (err, models) ->
        render
            models: models
            title: 'Models index'

# GET /models/:id
action 'show', ->
    render
        model: req.model
        title: 'Model show'

# GET /models/:id/edit
action 'edit', ->
    render
        model: req.model
        title: 'Model edit'

# PUT /models/:id
action 'update', ->
    FILTER_PROPERTIES.forEach (field) ->
        req.model[field] = req.body[field] if req.body[field]?

    req.model.save (err) ->
        if not err
            flash 'info', 'Model updated'
            redirect path_to.model(req.model)
        else
            flash 'error', 'Model can not be updated'
            render 'edit',
                model: req.model
                title: 'Edit model details'

# DELETE /models/:id
action 'destroy', ->
    req.model.remove (error) ->
        if error
            flash 'error', 'Can not destroy model'
        else
            flash 'info', 'Model successfully removed'
        send "'" + path_to.models + "'"
