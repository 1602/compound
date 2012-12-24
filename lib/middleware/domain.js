
module.exports = function () {
    var domain = require('domain');

    return function (req, res, next) {
        var d = domain.create();
        d.on('error', function (err) {
            err.message = err.message || 'Unknown error';
            res.statusCode = 500;
            res.end('<pre>' + err.stack + '</pre>');
            console.log(err);
            setTimeout(function () {
                d.dispose();
            }, 500);
        });
        d.run(next);
    };
};
