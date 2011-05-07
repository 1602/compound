app.configure('test', function(){
    app.use(require('express').errorHandler({ dumpExceptions: true, showStack: true }));
    app.settings.quiet = true;
});

