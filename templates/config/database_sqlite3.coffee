module.exports = 
  development:
    driver: "sqlite3"
    database: ":memory:"

  test:
    driver: "sqlite3"
    database: ":memory:"

  production:
    driver: "sqlite3"
    database: ":memory:"
