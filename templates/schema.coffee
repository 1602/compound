define 'User', ->
  property 'email', String, index: true
  property 'password', String
  property 'activated', Boolean, default: false

