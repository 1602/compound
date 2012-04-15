before(function controllerForSkipping() {
});

before(function runBeforeAll() {
    event('runBeforeAll');
    next();
});

before(function onlyOneAction() {
    event('onlyOneAction');
    next();
}, { only: 'action1' });

before(function onlyFewActions() {
    event('onlyFewActions');
    next();
}, { only: ['action1', 'action2'] });

before(function exceptOneAction() {
    event('exceptOneAction');
    next();
}, { except: 'action3' });

before(function exceptFewActions() {
    event('exceptFewActions');
    next();
}, { except: ['action3', 'action4'] });

skipBeforeFilter('controllerForSkipping');
skipBeforeFilter('runBeforeAll', { only: ['action1'] });

action(function action1() {
    event('action1');
});

action(function action2() {
    event('action2');
});

action(function action3() {
    event('action3');
});

action(function action4() {
    event('action4');
});

