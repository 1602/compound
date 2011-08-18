require('../test_helper.js').controller('models', module.exports);

var sinon  = require('sinon');

function ValidAttributes () {
    return {
        VALID_ATTRIBUTES
    };
}

exports['models controller'] = {

    'GET new': function (test) {
        test.get('/models/new', function(req, res) {
            test.assign('title', 'New model');
            test.assign('model');
            test.success();
            test.render('new');
            test.render('form.' + app.set('view engine'));
            test.done();
        });
    },

    'GET index': function (test) {
        test.get('/models', function(req, res) {
            test.success();
            test.render('index');
            test.done();
        });
    },

    'GET edit': function (test) {
        Model.findById = sinon.spy(function(key, callback) {
            test.strictEqual(key, '42');
            var model = new Model(ValidAttributes);
            model.id = '42';
            callback(null, model);
        });

        test.get('/models/42/edit', function(req, res) {
            test.success();
            test.render('edit');
            test.done();
        });
    },

    'GET show': function (test) {
        Model.findById = sinon.spy(function(key, callback) {
            test.strictEqual(key, '42');
            var model = new Model(ValidAttributes);
            model.id = '42';
            callback(null, model);
        });

        test.get('/models/42', function(req, res) {
            test.success();
            test.render('show');
            test.done();
        });
    },

    'POST create': function (test) {
        Model.create = sinon.spy(function(data, callback) {
            test.deepEqual(data, new ValidAttributes);
            var model = new Model(data);
            callback(null, model);
        });

        test.post('/models', new ValidAttributes, function(req, res) {
            test.redirect('/models');
            test.flash('info');
            test.done();
        });
    },

    'POST create fail': function (test) {
        Model.create = sinon.spy(function(data, callback) {
            test.deepEqual(data, new ValidAttributes);
            var model = new Model(data);
            callback(true, model);
        });

        test.post('/models', new ValidAttributes, function(req, res) {
            test.success();
            test.render('new');
            test.flash('error');
            test.done();
        });
    },

    'PUT update': function (test) {
        Model.findById = sinon.spy(function(key, callback){
            test.strictEqual(key, '42');
            var model = new Model(ValidAttributes);
            model.id = '42';
            model.save = sinon.spy(function(data, callback){
                test.notStrictEqual(model.Id, '42');
                callback(null, model);
            });
            callback(null, model);
        });

        test.put('/models/42', new ValidAttributes, function(req, res) {
            test.redirect('/models/42');
            test.flash('info');
            test.done();
        });
    },

    'PUT update fail': function (test) {
        Model.findById = sinon.spy(function(key, callback){
            test.strictEqual(key, '42');
            var model = new Model(ValidAttributes);
            model.id = '42';
            model.save = sinon.spy(function(data, callback){
                test.notStrictEqual(model.Id, '42');
                callback(true, model);
            });
            callback(null, model);
        });

        test.put('/models/42', new ValidAttributes, function(req, res) {
            test.success();
            test.render('edit');
            test.flash('error');
            test.done();
        });
    },

    'DELETE destroy': function (test) {
        Model.findById = sinon.spy(function(key, callback) {
            test.strictEqual(key, '42');
            var model = new Model(ValidAttributes);
            model.id = '42';
            model.destroy = sinon.spy(function(callback) {
                callback(null, true);
            });
            callback(null, model);
        });

        test.del('/models/42', {}, function(req, res) {
            test.send('/models');
            test.flash('info');
            test.done();
        });
    },

    'DELETE destroy fail': function (test) {
        Model.findById = sinon.spy(function(key, callback) {
            test.strictEqual(key, '42');
            var model = new Model(ValidAttributes);
            model.id = '42';
            model.destroy = sinon.spy(function(callback) {
                callback(true, false);
            });
            callback(null, model);
        });

        test.del('/models/42', {}, function(req, res) {
            test.send('/models');
            test.flash('error');
            test.done();
        });
    }
};

