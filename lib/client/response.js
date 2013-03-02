
module.exports = Response;

function Response(params) {
    this.app = params.app;
    this.pushState = params.pushState;
    this.req = params.req;
};

Response.prototype.render = function render(view, params, callback) {
    var res = this;
    var req = this.req;

    this.app.render(view, params, function (err, html) {
        if (callback) {
            callback(null, html);
        } else {
            $('body').html(html.match(/<body[^>]*>([\s\S.]*)<\/body>/i)[1]);
            $('title').text(html.match(/<title[^>]*>([\s\S.]*)<\/title>/i)[1]);
            if (typeof res.pushState === 'undefined' && req.routeParams && req.routeParams.state === false) {
                pushState = false;
            }
            if (pushState || typeof pushState === 'undefined') {
                window.history.pushState(null, '', path);
            }
            res.end();
            res.app.compound.emit('navigate');
        }
    });
};

Response.prototype.redirect = function redirect(url) {
    handleRoute({url: url});
};

Response.prototype.send = function() {};

Response.prototype.end = function() {};
