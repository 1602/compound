load('application');

action(function test() {
    event({
        user: use('requireUser'),
        admin: use('require admin')
    });
});

