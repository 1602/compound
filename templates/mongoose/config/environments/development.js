app.configure('development', function () {
    app.disable('view cache');
    app.disable('model cache');
    app.disable('eval cache');
    app.use(require('express').errorHandler({ dumpExceptions: true, showStack: true }));
});

