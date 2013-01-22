
var Compound = require('../compound');
var util = require('util');

module.exports = CompoundClient;

function CompoundClient(app, root) {
    Compound.call(this, app, root);

    this.__defineGetter__('rootModule', function() {
        return {filename: app.root + '/client.js'};
    });

    this.assetsCompiler = {init: function () {}};

    if (typeof console !== 'undefined' && console.log) {
        this.utils.debug = function () {
            console.log.apply(console, [].slice.call(arguments));
        };
    } else {
        this.utils.debug = function () {};
    }
}

util.inherits(CompoundClient, Compound);

// CompoundClient.prototype.getBridge = function () {
//     var compound = this;
//     return function bridge(ns, controller, action, params) {
//     return function (req, res, next) {
//         var Controller = compound.controller.constructClass(controller, compound.structure.controllers[controller]);
//         Controller.prototype.pathTo = compound.map.pathTo;
//
//         for (var m in compound.models) {
//             Controller.prototype[m] = compound.models[m];
//         }
//
//         for (var e in compound.controllerExtensions) {
//             Controller.prototype[e] = compound.controllerExtensions[e];
//         }
//
//         var ctl = new Controller;
//         ctl.compound = compound;
//         ctl.app = compound.app;
//         // console.log(controller, action);
//         req.routeParams = params;
//         ctl.perform(action || req.params.action, req, res, function(err) {
//         });
//     };
//     };
// };

CompoundClient.prototype.extensions = function () {
    require('./schema').init(this);
};

function match(path, method) {
    var res;
    routes.forEach(function (r) {
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
}
