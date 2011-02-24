var cache = {};

function Controller (name, code) {
    var filename = app.root + "/app/controllers/" + name;

    this.actions = {};
    this.beforeFilters = {};
    this.afterFilters = {};
    this.layout = null;

    cache[name] = cache[name] || fs.readFileSync(filename);
    var script = new require('vm').Script(cache[name], filename);
    script.runInNewContext(this);
}

Controller.prototype.action = function (name, action) {
    this.actions[name] = action;
};

Controller.prototype.beforeFilter = function (f, params) {
    this.beforeFilters.push([f, params]);
};

Controller.prototype.prependBeforeFilter = function (f, params) {
    this.beforeFilters.unshift([f, params]);
};

Controller.prototype.layout = function (layout) {
    this.layout = layout;
};

exports.load = function (name) {
    return new Controller(name);
};
