function beforeAll () {
    request.notify("beforeAll");
}
function beforeTestOnly () {
    request.notify("beforeTestOnly");
}
function beforeAllExceptTest () {
    request.notify("beforeAllExceptTest");
}

before(beforeTestOnly, {only: ["test"]});
beforeFilter(beforeAllExceptTest, {except: ["test"]});
prependBefore(beforeAll);

after(function () {request.notify("done");});

action("test", function () {
    request.notify("test");
});

action("action", function () {
    request.notify("action");
});
