module.exports = {
    development: {
        driver: 'sqlite3',
        database: 'db/{{ APPNAME }}-dev.sqlite3'
    },
    test: {
        driver: 'sqlite3',
        database: ':memory:'
    },
    production: {
        driver: 'sqlite3',
        database: 'db/{{ APPNAME }}.sqlite3'
    }
};
