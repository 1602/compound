load 'application'

before 'load model', ->
  Model.find params.id, (err, model) =>
    if err
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
  Model.create body.Model, (err, model) =>
    if err
      flash 'error', 'Model can not be created'
      @model = model
      @title = 'New model'
      render 'new'
    else
      flash 'info', 'Model created'
      redirect path_to.models

action 'index', ->
  Model.all (err, models) =>
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
  @model.updateAttributes body.Model, (err) =>
    if !err
      flash 'info', 'Model updated'
      redirect path_to.model(@model)
    else
      flash 'error', 'Model can not be updated'
      @title = 'Edit model details'
      render 'edit'

action 'destroy', ->
  @model.destroy (error) ->
    if error
      flash 'error', 'Can not destroy model'
    else
      flash 'info', 'Model successfully removed'
    send "'" + path_to.models + "'"

