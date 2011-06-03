app.configure('production', function () {
    app.enable('view cache');
    app.enable('model cache');
    app.enable('eval cache');
    app.enable('merge javascripts');
    app.enable('merge stylesheets');
    app.use(require('express').errorHandler());
    app.settings.quiet = true;
});

