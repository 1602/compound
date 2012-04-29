load('application');

before(loadModel, {only: ['show', 'edit', 'update', 'destroy']});

action('new', function () {
    this.title = 'New model';
    this.model = new Model;
    render();
});

action(function create() {
    Model.create(req.body.Model, function (err, model) {
        if (err) {
            flash('error', 'Model can not be created');
            render('new', {
                model: model,
                title: 'New model'
            });
        } else {
            flash('info', 'Model created');
            redirect(path_to.models);
        }
    });
});

action(function index() {
    this.title = 'Models index';
    Model.all(function (err, models) {
        render({
            models: models
        });
    });
});

action(function show() {
    this.title = 'Model show';
    render();
});

action(function edit() {
    this.title = 'Model edit';
    render();
});

action(function update() {
    this.model.updateAttributes(body.Model, function (err) {
        if (!err) {
            flash('info', 'Model updated');
            redirect(path_to.model(this.model));
        } else {
            flash('error', 'Model can not be updated');
            this.title = 'Edit model details';
            render('edit');
        }
    }.bind(this));
});

action(function destroy() {
    this.model.destroy(function (error) {
        if (error) {
            flash('error', 'Can not destroy model');
        } else {
            flash('info', 'Model successfully removed');
        }
        send("'" + path_to.models + "'");
    });
});

function loadModel() {
    Model.find(params.id, function (err, model) {
        if (err || !model) {
            redirect(path_to.models);
        } else {
            this.model = model;
            next();
        }
    }.bind(this));
}
