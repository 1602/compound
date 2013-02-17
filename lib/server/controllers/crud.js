module.exports = function (modelName, parentController) {

    var modelNameLower = modelName.toLowerCase();
    var modelNamePlural = require('../../utils').pluralize(modelNameLower);
    var modelNamePluralCamel = require('../../utils').pluralize(modelName);

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

    CRUDController.prototype['new'] = function (c) {
        this.title = 'New ' + modelNameLower;
        this[modelNameLower] = new (c[modelName]);
        c.render();
    };

    CRUDController.prototype.create = function create(c) {
        var self = this;
        c[modelName].create(c.body[modelName], function (err, model) {
            if (err) {
                c.flash('error', modelName + ' can not be created');
                self[modelNameLower] = model;
                c.render('new', {
                    title: 'New ' + modelNameLower
                });
            } else {
                c.flash('info', modelName + ' created');
                c.redirect(c.pathTo[modelNamePlural]);
            }
        });
    };

    CRUDController.prototype.index = function index(c) {
        var self = this;
        this.title = modelNamePluralCamel + ' index';
        c[modelName].all(function (err, models) {
            c.respondTo(function (format) {
                format.json(function () {
                    c.send(models);
                });
                format.html(function () {
                    self[modelNamePlural] = models;
                    c.render();
                });
            });
        });
    };

    CRUDController.prototype.show = function show(c) {
        this.title = modelName + ' show';
        var model = this[modelNameLower];
        c.respondTo(function (format) {
            format.json(function () {
                c.send(model);
            });
            format.html(function () {
                c.render();
            });
        });
    };

    CRUDController.prototype.edit = function edit(c) {
        this.title = modelName + ' edit';
        c.render();
    };

    CRUDController.prototype.update = function update(c) {
        var model = this[modelNameLower];
        var self = this;

        this.title = modelName + ' edit';

        model.updateAttributes(c.body[modelName], function (err) {
            c.respondTo(function (format) {
                format.json(function () {
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
                format.html(function () {
                    if (!err) {
                        c.flash('info', modelName + ' updated');
                        c.redirect(c.pathTo[modelNameLower](model));
                    } else {
                        c.flash('error', modelName + ' can not be updated');
                        c.render('edit');
                    }
                });
            });
        });

    };

    CRUDController.prototype.destroy = function destroy(c) {
        this[modelNameLower].destroy(function (error) {
            if (error) {
                c.flash('error', 'Can not destroy ' + modelNameLower);
            } else {
                c.flash('info', modelName + ' successfully removed');
            }
            c.send("'" + c.pathTo[modelNamePlural] + "'");
        });
    };

    function loadModel(c) {
        var self = this;
        c[modelName].find(c.params.id, function (err, model) {
            if (err || !model) {
                c.redirect(c.pathTo[modelNamePlural]);
            } else {
                self[modelNameLower] = model;
                c.next();
            }
        });
    }

    return CRUDController;

};
