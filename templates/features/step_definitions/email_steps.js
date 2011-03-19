var Steps = require('cucumis').Steps;
var mailBox = [], currentEmail;
var assert = require('assert');

require('mailer').send = function (email, cb) {
    mailBox.push(email);
    process.nextTick(cb);
};

require('nodemailer').send_mail = function (email, cb) {
    mailBox.push(email);
    process.nextTick(cb);
};

Steps.Then(/^I should receive new email with subject "([^"]*?)"$/, function (ctx, subject) {
    setTimeout(function () {
        var lastEmail = mailBox[mailBox.length - 1];
        assert.ok(lastEmail, 'No email in mailbox, it seems that mailer.send() did not called');
        assert.equal(lastEmail.subject, subject, "Email subject not matched, expected: \"" + subject + "\", got: \"" + lastEmail.subject + "\"");
        ctx.done();
    }, 500);
});

Steps.When(/^I open email$/, function (ctx) {
    currentEmail = mailBox.pop();
    assert.ok(currentEmail);
    ctx.done();
});

Steps.Then(/^I should see "([^"]*?)" in email body$/, function (ctx, text) {
    assert.ok(currentEmail.body && currentEmail.body.indexOf(text) !== -1,
        'Email body should contain "' + text + '" but it is just: "' + currentEmail.body + '"');
    ctx.done();
});

Steps.When(/^I follow the link in email body$/, function (ctx) {
    var result = currentEmail.body.match(/(http:\/\/.*?)(\s|$)/);
    assert.ok(result, 'Email body does not contain link: ' + currentEmail.body);
    var link = result[0].replace(/http:\/\/.*?\//, '/');
    Steps.browser.get(link, ctx.done);
});
