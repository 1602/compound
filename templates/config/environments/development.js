app.configure('development', function () {
    app.enable('log actions');
    app.enable('env info');
    app.enable('watch');
    app.use(require('express').errorHandler({ dumpExceptions: true, showStack: true }));
});

