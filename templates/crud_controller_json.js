load('application');

before(loadModel, {only: ['show', 'edit', 'update', 'destroy']});

action('new', function () {
    this.model = new Model;
    send(this.model);
});

action(function create() {
    Model.create(req.body.Model, function (err, model) {
            if(err){
                send(500, { error: 'Model can not be created' });
            }else{
                send(model);
            }  
    });
});

action(function index() {
    Model.all(function (err, models) {
		send(models); 
    });
});

action(function show() {
        send(this.model);
});

action(function edit() {
        send(this.model);
});

action(function update() {
    this.model.updateAttributes(body.Model, function (err) {
        if (!err) {
			send(this.model);
		} else {
            send(500, { error: 'Model can not be updated' });
        }
    }.bind(this));
});

action(function destroy() {
    this.model.destroy(function (err) {
        if (err) {
            send(500, { error: 'Model can not be destroyed' });
        } else {
			send(200); 
        }
    });
});

function loadModel() {
    Model.find(params.id, function (err, model) {
        if (err || !model) {
            send(500, { error: 'Model can not be found' });
        } else {
            this.model = model;
            next();
        }
    }.bind(this));
}
