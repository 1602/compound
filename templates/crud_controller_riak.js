before(loadModel, {only: ['show', 'edit', 'update', 'destroy']});

action('new', function () {
    this.title = 'New model';
    this.model = new Model;
    render();
});

action('create', function () {
    Model.create(req.body, function (error, model) {
        if (error) {
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

action('index', function () {
    this.title = 'Models index';
    Model.allInstances(function (error, models) {
        render({
            models: models || [],
        });
    });
});

action('show', function () {
    this.title = 'Model show';
    render();
});

action('edit', function () {
    this.title = 'Model edit';
    render();
});

action('update', function () {
    this.model.save(req.body, function (error, model) {
        if (error) {
            flash('error', 'Model can not be updated');
            this.title = 'Edit model details';
            render('edit');
        } else {
            flash('info', 'Model updated');
            redirect(path_to.model(this.model));
        }
    }.bind(this));
});

action('destroy', function () {
    this.model.destroy(function (error, success) {
        if (error) {
            flash('error', 'Can not destroy model');
        } else {
            flash('info', 'Model successfully removed');
        }
        send("'" + path_to.models + "'");
    });
});

function loadModel () {
    Model.findById(req.params['id'], function (error, model) {
        if (error || !model) {
            redirect(path_to.models);
        } else {
            this.model = model;
            next();
        }
    }.bind(this));
}
