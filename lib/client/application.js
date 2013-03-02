
var path = require('path');
var ejs = require('ejs');
var util = require('util');
var Request = require('./request');
var Response = require('./response');

module.exports = function expressClient(conf) {
    return new Application(conf);
};

[ 'basicAuth', 'bodyParser', 'compress', 'cookieParser', 'cookieSession',
    'csrf', 'directory', 'errorHandler', 'favicon', 'json', 'limit',
    'logger', 'methodOverride', 'multipart', 'query', 'responseTime',
    'session', 'static', 'staticCache', 'timeout', 'urlencoded', 'vhost'
].forEach(function (name) {
    module.exports[name] = function () {};
});

function Application() {
    this.settings = {};
    this.routes = [];
    this.handle = this.getHandler();
    this.engines = {};
}

util.inherits(Application, require('events').EventEmitter);

Application.prototype.set = function set(k, v) {
    if (arguments.length === 2) {
        this.settings[k] = v;

    } else if (arguments.length === 1) {
        return this.settings[k];
    }
};

Application.prototype.disable = function (k) {
    this.settings[k] = false;
    return this;
};

Application.prototype.enable = function (k) {
    this.settings[k] = true;
    return this;
};

Application.prototype.disabled = function (k) {
    return !this.settings[k];
};

Application.prototype.enabled = function (k) {
    return !!this.settings[k];
};

Application.prototype.use = function () {
    // TODO: implement me
    return this;
};

Application.prototype.configure = function (env, conf) {
    if (typeof env === 'function') {
        conf = env;
        env = null;
    }
    if (!env || env === this.set('env') || env === 'all') {
        conf.call(this);
    }
    return this;
};

Application.prototype.engine = function (ext, handler){
    if (!ext.match(/^\./)) {
        ext = '.' + ext;
    }
    this.engines[ext] = handler;
    return this;
};

Application.prototype.render = function (file, params, cb) {
    var ext = path.extname(file);
    var engine = this.engines[ext];
    if (!engine) {
        engine = this.engines[path.extname(file)] = require(ext.substr(1)).__express;
    }
    engine(file, params, cb);
};

Application.prototype.getHandler = function () {
    var self = this;
    return function handleRoute(params, next) {
    // console.log('arguments', arguments);
    if (!next) next = function () {};
    var $el = $(this);
    var method = 'GET';
    var data = {};
    var path;
    var pushState;
    if (typeof params === 'object' && params.url) {
        path = params.url;
        method = params.method || method;
        pushState = params.pushState;
    } else if ($el.is('form')) {
        $el.serializeArray().forEach(function (i) {
            var m = i.name.match(/^(.*?)\[(.*?)\]$/);
            if (m) {
                data[m[1]] = data[m[1]] || {};
                data[m[1]][m[2]] = i.value;
            } else {
                data[i.name] = i.value;
            }
        });
        method = $el.attr('method');
        if (data._method) method = data._method;
        path = $el.attr('action');
    } else {
        path = $el.attr('href');
    }
    var m = self.match(path, method);
    // console.log(m);
    if (m) {
        var params = [].slice.call(m.values, 1);
        params.forEach(function (v, i) {
            params[m.route.params[i]] = v;
        });
        var req = new Request({
            app: self,
            url: path,
            method: method,
            params: params,
            body: data
        });
        var res = new Response({
            app: self,
            pushState: pushState,
            req: req
        });
        try {
            m.route.tail[0](req, res, next);
        } catch(e) {
            console.log(e.stack);
        }
        return false;
    } else {
        console.log('no routes matched', path);
        return true;
    }
};
};

['get', 'post', 'put', 'patch', 'delete', 'del', 'all'].forEach(function (method) {
    Application.prototype[method] = function (path) {
        if (method === 'get' && typeof path === 'string' && arguments.length === 1) {
            return this.settings[path];
        }
        this.routes.push({
            method: method === 'delete' ? 'del' : method,
            path: path,
            re: new RegExp('^' + path.replace(/\.?:([^\/\?\.])+/g, '([^\/\?\.]+)') + '$'),
            params: (path.match(/:[^\/\?\.]+/g) || []).map(function (s) {
                return s.substr(1);
            }),
            tail: [].slice.call(arguments, 1)
        });
    };
});

Application.prototype.match = function match(path, method) {
    var res;
    this.routes.forEach(function (r) {
        if (res) return;
        // console.log(method, r.method);
        // console.log(r.re, path);
        if (r.method.toLowerCase() !== method.toLowerCase()) return;
        var m = path.split(/[\?\#]/g)[0].match(r.re);
        if (m) {
            res = {
                route: r,
                params: r.params,
                values: m
            };
        }
    });
    return res;
};

Application.prototype.path = function () {
    return '';
};
