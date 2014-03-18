module.exports =
  development:
    driver: "mysql"
    host:   "localhost"
    port:   3306
    username: "root"
    password: ""
    database: "{{ APPNAME }}_dev"

  test:
    driver: "mysql"
    host:   "localhost"
    port:   3306
    username: "root"
    password: ""
    database: "{{ APPNAME }}_test"

  production:
    driver: "mysql"
    host:   "localhost"
    port:   3306
    username: "root"
    password: ""
    database: "{{ APPNAME }}_production"
