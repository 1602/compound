
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
        if (err) throw err;
        if (callback) {
            callback(null, html);
        } else {
            $('body').html(html.match(/<body[^>]*>([\s\S.]*)<\/body>/i)[1]);
            $('title').text(html.match(/<title[^>]*>([\s\S.]*)<\/title>/i)[1]);
            if (typeof res.pushState === 'undefined' && req.routeParams && req.routeParams.state === false) {
                res.pushState = false;
            }
            if (res.pushState || typeof res.pushState === 'undefined') {
                window.history.pushState(null, '', res.req.url);
            }
            res.end();
            res.app.compound.emit('navigate');
        }
    });
};

Response.prototype.redirect = function redirect(url) {
    this.app.handle({url: url});
};

Response.prototype.send = function() {};

Response.prototype.end = function() {};
