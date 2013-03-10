module.exports = function(compound) {
    var app = compound.app;
    compound.tools.database = function db() {
        var action = process.argv[3];
        switch (action) {
            case 'migrate':
            case 'update':
            perform(action, process.exit);
            break;
            default:
            console.log('Unknown action', action);
            break;
        }
    };

    compound.tools.database.help = {
        shortcut:    'db',
        usage:       'db [migrate|update]',
        description: 'Migrate or update database(s)'
    };

    function getUniqueSchemas() {
        var schemas = [];
        Object.keys(compound.models).forEach(function (modelName) {
            var Model = compound.models[modelName];
            var schema = Model.schema;
            if (!~schemas.indexOf(schema)) {
                schemas.push(schema);
            }
        });
        return schemas;
    }

    function perform(action, callback) {
        console.log('Perform', action, 'on');
        var wait = 0;
        getUniqueSchemas().forEach(function (schema) {
            if (schema['auto' + action]) {
                console.log(' - ' + schema.name);
                wait += 1;
                process.nextTick(function () {
                    schema['auto' + action](done);
                });
            }
        });

        if (wait === 0) done(); else console.log(wait);

        function done() {
            if (--wait === 0) callback();
        }

        return true;
    }

};
