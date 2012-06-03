railway.tools.database = ()->
  action = process.argv[3]
  switch action
    when 'migrate', 'update'
      perform action, process.exit
    else
      console.log 'Unknown action', action

railway.tools.database.help =
  shortcut:    'db'
  usage:       'db [migrate|update]'
  description: 'Migrate or update database(s)'

getUniqueSchemas = ()->
  schemas = []
  Object.keys(app.models).forEach (modelName)->
    Model = app.models[modelName]
    schema = Model.schema
    if !~schemas.indexOf(schema)
      schemas.push schema
  schemas

perform = (action, callback)->
  console.log 'Perform', action, 'on'
  wait = 0
  getUniqueSchemas().forEach (schema)->
    if schema['auto' + action]
      console.log ' - ' + schema.name
      wait += 1
      process.nextTick ->
        schema['auto' + action](done)

  if wait == 0
    done()
  else
    console.log wait

  done = ()->
      if --wait == 0 then callback()
