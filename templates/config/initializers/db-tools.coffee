module.exports = (compound) ->
  app = compound.app
  compound.tools.database = ()->
    action = process.argv[3]
    switch action
      when 'migrate', 'update'
        perform action, process.exit
      else
        console.log 'Unknown action', action

  compound.tools.database.help =
    shortcut:    'db'
    usage:       'db [migrate|update]'
    description: 'Migrate or update database(s)'

  getUniqueSchemas = ()->
    schemas = []
    Object.keys(compound.models).forEach (modelName)->
      Model = compound.models[modelName]
      schema = Model.schema
      if !~schemas.indexOf(schema)
        schemas.push schema
    schemas

  perform = (action, callback)->
    wait = 0
    done = ()->
        if --wait == 0 then callback()

    console.log 'Perform', action, 'on'
    getUniqueSchemas().forEach (schema)->
      console.log ' - ' + schema.name
      if schema['auto' + action]
        wait += 1
        process.nextTick ->
          schema['auto' + action](done)

    if wait == 0
      done()
    else
      console.log wait

    return true
