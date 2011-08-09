before ->
    Model.findById req.params['id'], (error, model) =>
        if error or not model
            redirect path_to.models
        else
            @model = model
            next()
, only: ['show', 'edit', 'update', 'destroy']

action 'new', ->
    @model = new Model
    @title = 'New model'
    render()

action 'create', ->
    Model.create req.body, (error, model) =>
        if error
            flash 'error', 'Model can not be created'
            @model = model
            @title = 'New model'
            render 'new'
        else
            flash 'info', 'Model created'
            redirect path_to.models

action 'index', ->
    Model.allInstances (error, models) =>
        @models = models
        @title = 'Models index'
        render()

action 'show', ->
    @title = 'Model show'
    render()

action 'edit', ->
    @title = 'Model edit'
    render()

action 'update', ->
    @model.save req.body, (error, model) =>
        if error
            flash 'error', 'Model can not be updated'
            @title = 'Edit model details'
            render 'edit'
        else
            flash 'info', 'Model updated'
            redirect path_to.model(@model)

action 'destroy', ->
    @model.destroy (error, success) ->
        if error
            flash 'error', 'Can not destroy model'
        else
            flash 'info', 'Model successfully removed'
        send "'" + path_to.models + "'"

