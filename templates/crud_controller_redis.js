before(loadModel, {only: ['show', 'edit', 'update', 'destroy']});

action('new', function () {
    var model = new Model;
    render({
        model: model,
        title: 'New model'
    });
});

action('create', function () {
    Model.create(req.body, function (errors) {
        if (errors) {
            flash('error', 'Model can not be created');
            render('new', {
                model: this,
                title: 'New model'
            });
        } else {
            flash('info', 'Model created');
            redirect(path_to.models);
        }
    });
});

action('index', function () {
    Model.allInstances(function (models) {
        render({
            models: models,
            title: 'Models index'
        });
    });
});

action('show', function () {
    render({
        model: req.model,
        title: 'Model show'
    });
});

action('edit', function () {
    render({
        model: req.model,
        title: 'Model edit'
    });
});

action('update', function () {
    req.model.update(req.body, function (err) {
        if (!err) {
            flash('info', 'Model updated');
            redirect(path_to.models);
        } else {
            flash('error', 'Model can not be updated');
            render('edit', {
                model: model,
                title: 'Edit model details'
            });
        }
    });
});

action('destroy', function () {
    req.model.destroy(function (error) {
        if (err || error) {
            flash('error', 'Can not destroy model');
        } else {
            flash('info', 'Model successfully removed');
        }
        send("'" + path_to.model + "'");
    });
});

function loadModel (id) {
    Model.find(id, function (err) {
        if (err) {
            redirect(path_to.models);
        } else {
            req.model = this;
            next();
        }
    });
}
