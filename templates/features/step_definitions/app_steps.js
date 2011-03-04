var app = require('../../app');
var Steps = require('cucumis').Steps;

Steps.Given(/^email "([^"]*?)" is not registered in app$/, function (ctx, email) {
    email = email.replace('(at)', '@');
    app.models.User.find_by_email(email, function (err, user) {
        if (!err) {
            user.destroyFully(ctx.done);
        } else {
            ctx.done();
        }
    });
});
