filterParameterLogging('creditcard');

before(function authencityTokenChecking() {
    protectFromForgery('secret');
});

publish(function requireUser() {
    next();
});

publish('require admin', function () {
    next();
});

