module.exports = 
  development:
    driver:   "riak"
    host:     "localhost"
    database: "APPNAME-dev"

  test:
    driver:   "riak"
    host:     "localhost"
    database: "APPNAME-test"

  production:
    driver:   "riak"
    host:     "localhost"
    database: "APPNAME-production"
