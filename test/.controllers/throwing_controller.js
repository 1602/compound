before(function () {
    next(new Error('Something went wrong'));
});

action(function neverWillBeExecuted() {
    render();
});

