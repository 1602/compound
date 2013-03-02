
module.exports = Request;

function Request(params) {
    params = params || {};
    for (var key in params) {
        if (params.hasOwnProperty(key) && !this.hasOwnProperty(key)) {
            this[key] = params[key];
        }
    }
    this.method = this.method || 'GET';
    this.session = {};
    this.originalMethod = this.method;
    this.query = {};
    this.csrfToken = $('meta[name=csrf-token]').attr('content');
    this.csrfParam = $('meta[name=csrf-param]').attr('content');
}

Request.prototype.param = function(name) {
    return this.params[name];
};

Request.prototype.header = function() {
};
