
module.exports = function (modelName, parentController) {

    var modelNameLower = modelName.toLowerCase();
    var modelNamePlural = require('../server/utils').pluralize(modelNameLower);
    var modelNamePluralCamel = require('../server/utils').pluralize(modelName);

    function CRUDController(init) {
        if (parentController) {
            parentController.call(this, init);
        }

        init.before(loadModel, {
            only: ['show', 'edit', 'update', 'destroy']
        });
    }

    if (parentController) {
        require('util').inherits(CRUDController, parentController);
    }

    CRUDController.prototype.create = function create(c) {
        var self = this;
        c[modelName].create(c.body[modelName], function (err, model) {
            if (err) {
                c.send({
                    code: 500,
                    error: model.errors || err
                });
            } else {
                var res = {
                    code: 200
                }
                res[modelNameLower] = model;
                c.send(res);
            }
        });
    };

    CRUDController.prototype.index = function index(c) {
        var self = this;
        this.title = modelNamePluralCamel + ' index';
        c[modelName].all(function (err, models) {
            if (err) {
                c.send({code: 500, error: err});
            } else {
                var res = {code: 200};
                res[modelNamePlural] = models.map(function (m) {
                    return m.toObject();
                });
                c.send(res);
            }
        });
    };

    CRUDController.prototype.show = function show(c) {
        this.title = modelName + ' show';
        var model = this[modelNameLower];
        var res = {code: 200};
        res[modelNameLower] = model.toObject();
        c.send(res);
    };

    CRUDController.prototype.update = function update(c) {
        var model = this[modelNameLower];
        var self = this;

        this.title = modelName + ' edit';

        model.updateAttributes(c.body[modelName], function (err) {
            if (err) {
                c.send({
                    code: 500,
                    error: model && model.errors || err
                });
            } else {
                var res = {code: 200};
                res[modelNameLower] = model.toObject();
                c.send(res);
            }
        });

    };

    CRUDController.prototype.destroy = function destroy(c) {
        this[modelNameLower].destroy(function (error) {
            if (error) {
                c.send({code: 500, error: error});
            } else {
                c.send({code: 200});
            }
        });
    };

    function loadModel(c) {
        var self = this;
        c[modelName].find(c.params.id, function (err, model) {
            if (err) {
                return c.send({code: 500, error: err});
            }
            if (!model) {
                return c.send({code: 404});
            }
            self[modelNameLower] = model;
            c.next();
        });
    }

    return CRUDController;

};
