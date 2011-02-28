require('./spec_helper').init(exports);
global.app = {root: __dirname + '/..'};

var c = require('../lib/controller').load('test_controller.js');

it('should load controller', function (test) {
    test.ok(c.respondTo('test'));
    test.ok(c.respondTo('action'));
    test.done();
});

it('should perform test action',   perform('test',   'beforeAllExceptTest'));
it('should perform action action', perform('action', 'beforeTestOnly'));

function perform (action, except) {
    return function (test) {
        var req = {
            notify: sinon.spy(function (msg) {
                test.notEqual(msg, except);
                if (msg == 'done') done();
                c.next();
            }),
            render:   function () {},
            send:     function () {},
            redirect: function () {},
            flash:    function () {}
        };

        c.perform(action, req, 'res');

        function done () {
            test.equal(req.notify.callCount, 4);
            test.done();
        }
    }
}
