require('../test_helper.js').controller('models', module.exports);

var sinon  = require('sinon');

function ValidAttributes () {
    return {
        VALID_ATTRIBUTES
    };
}

exports['models controller'] = {

    'GET new': function (test) {
        test.get('/models/new', function () {
            test.success();
            test.render('new');
            test.render('form.' + app.set('view engine'));
            test.done();
        });
    },

    'GET index': function (test) {
        test.get('/models', function () {
            test.success();
            test.render('index');
            test.done();
        });
    },

    'GET edit': function (test) {
        var find = Model.find;
        Model.find = sinon.spy(function (id, callback) {
            callback(null, new Model);
        });
        test.get('/models/42/edit', function () {
            test.ok(Model.find.calledWith('42'));
            Model.find = find;
            test.success();
            test.render('edit');
            test.done();
        });
    },

    'GET show': function (test) {
        var find = Model.find;
        Model.find = sinon.spy(function (id, callback) {
            callback(null, new Model);
        });
        test.get('/models/42', function (req, res) {
            test.ok(Model.find.calledWith('42'));
            Model.find = find;
            test.success();
            test.render('show');
            test.done();
        });
    },

    'POST create': function (test) {
        var model = new ValidAttributes;
        var create = Model.create;
        Model.create = sinon.spy(function (data, callback) {
            test.strictEqual(data, model);
            callback(null, model);
        });
        test.post('/models', {Model: model}, function () {
            test.redirect('/models');
            test.flash('info');
            test.done();
        });
    },

    'POST create fail': function (test) {
        var model = new ValidAttributes;
        var create = Model.create;
        Model.create = sinon.spy(function (data, callback) {
            test.strictEqual(data, model);
            callback(new Error, model);
        });
        test.post('/models', {Model: model}, function () {
            test.success();
            test.render('new');
            test.flash('error');
            test.done();
        });
    },

    'PUT update': function (test) {
        Model.find = sinon.spy(function (id, callback) {
            test.equal(id, 1);
            callback(null, {id: 1, updateAttributes: function (data, cb) { cb(null); }});
        });
        test.put('/models/1', new ValidAttributes, function () {
            test.redirect('/models/1');
            test.flash('info');
            test.done();
        });
    },

    'PUT update fail': function (test) {
        Model.find = sinon.spy(function (id, callback) {
            test.equal(id, 1);
            callback(null, {id: 1, updateAttributes: function (data, cb) { cb(new Error); }});
        });
        test.put('/models/1', new ValidAttributes, function () {
            test.success();
            test.render('edit');
            test.flash('error');
            test.done();
        });
    },

    'DELETE destroy': function (test) {
        test.done();
    },

    'DELETE destroy fail': function (test) {
        test.done();
    }
};

