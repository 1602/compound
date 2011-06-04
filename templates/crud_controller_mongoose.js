load('application');
before(loadModel, {only: ['show', 'edit', 'update', 'destroy']});

action('new', function () {
    var model = new Model;
    render({
        model: model,
        title: 'New model'
    });
});

action('create', function () {
    req.model = new Model;
    FILTER_PROPERTIES.forEach(function (field) {
        if (typeof req.body[field] !== 'undefined') {
            req.model[field] = req.body[field];
        }
    });
    req.model.save(function (errors) {
        if (errors) {
            flash('error', 'Model can not be created');
            render('new', {
                model: req.model,
                title: 'New model'
            });
        } else {
            flash('info', 'Model created');
            redirect(path_to.models);
        }
    });
});

action('index', function () {
    Model.find(function (err, models) {
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
    FILTER_PROPERTIES.forEach(function (field) {
        if (typeof req.body[field] !== 'undefined') {
            req.model[field] = req.body[field];
        }
    });

    req.model.save(function (err) {
        if (!err) {
            flash('info', 'Model updated');
            redirect(path_to.model(req.model));
        } else {
            flash('error', 'Model can not be updated');
            render('edit', {
                model: req.model,
                title: 'Edit model details'
            });
        }
    });
});

action('destroy', function () {
    req.model.remove(function (error) {
        if (error) {
            flash('error', 'Can not destroy model');
        } else {
            flash('info', 'Model successfully removed');
        }
        send("'" + path_to.models + "'");
    });
});

function loadModel () {
    Model.findById(req.params.id, function (err, model) {
        if (err || !model) {
            redirect(path_to.models);
        } else {
            req.model = model;
            next();
        }
    });
}
