module.exports = {
    development: {
        driver:   'mongodb',
        url:      'mongodb://localhost/APPNAME-dev'
    },
    test: {
        driver:   'mongodb',
        url:      'mongodb://localhost/APPNAME-test'
    },
    production: {
        driver:   'mongodb',
        url:      'mongodb://localhost/APPNAME-production'
    }
};
