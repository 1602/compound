load('application');

before(loadModel, {only: ['show', 'edit', 'update', 'destroy']});

action('new', function () {
    this.model = new Model;
    this.title = 'New model';
    render();
});

action('create', function () {
    this.model = new Model;
    FILTER_PROPERTIES.forEach(function (field) {
        if (typeof req.body[field] !== 'undefined') {
            this.model[field] = req.body[field];
        }
    }.bind(this));
    this.model.save(function (errors) {
        if (errors) {
            this.title = 'New model';
            flash('error', 'Model can not be created');
            render('new');
        } else {
            flash('info', 'Model created');
            redirect(path_to.models);
        }
    }.bind(this));
});

action('index', function () {
    Model.find(function (err, models) {
        this.models = models;
        this.title = 'Models index';
        render();
    }.bind(this));
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
    FILTER_PROPERTIES.forEach(function (field) {
        if (typeof req.body[field] !== 'undefined') {
            this.model[field] = req.body[field];
        }
    }.bind(this));

    this.model.save(function (err) {
        if (!err) {
            flash('info', 'Model updated');
            redirect(path_to.model(this.model));
        } else {
            this.title = 'Edit model details';
            flash('error', 'Model can not be updated');
            render('edit');
        }
    }.bind(this));
});

action('destroy', function () {
    this.model.remove(function (error) {
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
            this.model = model;
            next();
        }
    }.bind(this));
}
