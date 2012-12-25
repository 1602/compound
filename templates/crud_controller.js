var Application = require('./application');

var ModelsController = module.exports = function ModelsController(init) {
    Application.call(this, init);

    init.before(loadModel, {
        only: ['show', 'edit', 'update', 'destroy']
    });
};

require('util').inherits(ModelsController, Application);

ModelsController.prototype['new'] = function (c) {
    this.title = 'New model';
    this.model = new (c.Model);
    c.render();
};

ModelsController.prototype.create = function create(c) {
    c.Model.create(c.body.Model, function (err, model) {
        if (err) {
            c.flash('error', 'Model can not be created');
            c.render('new', {
                model: model,
                title: 'New model'
            });
        } else {
            c.flash('info', 'Model created');
            c.redirect(c.pathTo.models);
        }
    });
};

ModelsController.prototype.index = function index(c) {
    this.title = 'Models index';
    c.Model.all(function (err, models) {
        c.respondTo(function (format) {
            format.json(function () {
                c.send(models);
            });
            format.html(function () {
                c.render({
                    models: models
                });
            });
        });
    });
};

ModelsController.prototype.show = function show(c) {
    this.title = 'Model show';
    var model = this.model;
    c.respondTo(function (format) {
        format.json(function () {
            c.send(model);
        });
        format.html(function () {
            c.render();
        });
    });
};

ModelsController.prototype.edit = function edit(c) {
    this.title = 'Model edit';
    c.render();
};

ModelsController.prototype.update = function update(c) {
    var model = this.model;
    var self = this;

    this.title = 'Model edit';

    model.updateAttributes(c.body.Model, function (err) {
        c.respondTo(function (format) {
            format.json(function () {
                if (err) {
                    c.send({
                        code: 500,
                        error: model && model.errors || err
                    });
                } else {
                    c.send({
                        code: 200,
                        model: model.toObject()
                    });
                }
            });
            format.html(function () {
                if (!err) {
                    c.flash('info', 'Model updated');
                    c.redirect(c.pathTo.model(model));
                } else {
                    c.flash('error', 'Model can not be updated');
                    c.render('edit');
                }
            });
        });
    });

};

ModelsController.prototype.destroy = function destroy(c) {
    this.model.destroy(function (error) {
        if (error) {
            c.flash('error', 'Can not destroy model');
        } else {
            c.flash('info', 'Model successfully removed');
        }
        c.send("'" + c.pathTo.models + "'");
    });
};

function loadModel(c) {
    var self = this;
    c.Model.find(c.params.id, function (err, model) {
        if (err || !model) {
            c.redirect(c.pathTo.models);
        } else {
            self.model = model;
            c.next();
        }
    });
}
