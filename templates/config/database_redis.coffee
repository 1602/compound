module.exports = 
  development:
    driver:   "redis"
    host:     "localhost"
    database: 2

  test:
    driver:   "redis"
    host:     "localhost"
    database: 1

  production:
    driver:   "redis"
    host:     "localhost"
    database: 0
