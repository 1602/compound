module.exports = {
    development: {
        driver: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'root',
        password: '',
        database: '{{ APPNAME }}_dev',
        debug: true
    },
    test: {
        driver: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'root',
        password: '',
        database: '{{ APPNAME }}_test'
    },
    production: {
        driver: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'root',
        password: '',
        database: '{{ APPNAME }}_production'
    }
};
