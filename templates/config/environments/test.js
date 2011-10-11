app.configure('test', function(){
    app.use(require('express').errorHandler({ dumpExceptions: true, showStack: true }));
    app.settings.quiet = true;
    app.enable('view cache');
    app.enable('model cache');
    app.enable('eval cache');
});

