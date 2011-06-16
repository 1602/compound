load 'application'

before ->
    Model.findById req.params.id, (err, model) =>
        if err or not model
            redirect path_to.models
        else
            @model = model
            next()
, only: ['show', 'edit', 'update', 'destroy']

# GET /models/new
action 'new', ->
    @model = new Model
    @title = 'New model'
    render()

# POST /models
action 'create', ->
    @model = new Model
    FILTER_PROPERTIES.forEach (field) =>
        @model[field] = req.body[field] if req.body[field]?

    @model.save (errors) ->
        if errors
            flash 'error', 'Model can not be created'
            render 'new',
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
    @title = 'Show model'
    render()

# GET /models/:id/edit
action 'edit', ->
    @title = 'Edit model details'
    render()

# PUT /models/:id
action 'update', ->
    FILTER_PROPERTIES.forEach (field) =>
        @model[field] = req.body[field] if req.body[field]?

    @model.save (err) =>
        if not err
            flash 'info', 'Model updated'
            redirect path_to.model(@model)
        else
            flash 'error', 'Model can not be updated'
            render 'edit',
                title: 'Edit model details'

# DELETE /models/:id
action 'destroy', ->
    @model.remove (error) ->
        if error
            flash 'error', 'Can not destroy model'
        else
            flash 'info', 'Model successfully removed'
        send "'" + path_to.models + "'"
