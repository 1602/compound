require('./spec_helper').init(exports);

it('should camelize string', function (test) {
    var cc = railway.utils.camelize;
    test.equal(cc('underscored_string'), 'underscoredString');
    test.equal(cc('underscored_string', 1), 'UnderscoredString');
    test.done();
});

it('should humanize string', function (test) {
    var hs = railway.utils.humanize;
    test.equal(hs('hey_man'), 'Hey man');
    test.done();
});

it('should classify string', function (test) {
    var hs = railway.utils.classify;
    test.equal(hs('bio_robots'), 'bioRobot');
    test.done();
});

it('should underscore string', function (test) {
    var us = railway.utils.underscore;
    test.equal(us('IAmARobot'), 'i_am_a_robot'),
    test.equal(us('_IAmARobot'), '_i_am_a_robot'),
    test.equal(us('_iAmARobot'), '_i_am_a_robot'),
    test.done();
});

it('should add spaces', function (test) {
    test.equal('hello   ', railway.utils.addSpaces('hello', 8));
    test.equal('   hello', railway.utils.addSpaces('hello', 8, true));
    test.done();
});

