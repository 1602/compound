var riak_lib = require('riak-js');
var uuid = require('node-uuid');
var sys = require("sys");

var riak = riak_lib.getClient();

exports.configure = function (config) {
    config.host = config.host || '127.0.0.1';
    config.port = config.port || 8098;

    riak = riak_lib.getClient(config);
};

function castForDatabase(properties, attr, data) {
    var type = properties[attr].type;
    switch (typeof type == 'function' ? type.name : type) {
        case 'json':
            return new Buffer(JSON.stringify(data), 'utf-8');

        case 'Date':
        case 'String':
        case 'Number':
            return new Buffer((data == undef || data == null ? '' : data).toString(), 'utf-8');

        default:
            return data ? data.toString() : '';
    }
}

function castFromDatabase(properties, attr, data) {
    if (!properties[attr]) {
        return;
    }
    var type = properties[attr].type;
    switch (typeof type == 'function' ? type.name : type) {
        case 'Number':
            data = parseInt(data, 10);
            break;
        case 'Date':
            if (data == '') data = null;
            data = new Date(data);
            break;
        case 'String':
            data = (data || '').toString();
            break;
        case 'Boolean':
            data = data == 'true' || data == '1';
            break;
        case 'json':
            try {
                data = JSON.parse(data.toString('utf-8'));
            } catch(e) {
                console.log(data.toString('binary'));
                throw e;
            }
            break;
        default:
            data = parseInt(data, 10);
            break;
    }
    return data;
}

exports.mixPersistMethods = function (Model, description) { // model_name, properties, associations) {
    // TODO: underscorize
    var model_name = description.className,
        model_name_lowercase = model_name.toLowerCase(),
        primary_key = description.primaryKey || 'id',
        table_name = description.tableName,
        properties = description.properties,
        associations = description.associations,
        scopes = description.scopes;

    var cache = {};

    Object.defineProperty(Model, 'connection', {
        enumerable: false,
        value: riak
    });
    Object.defineProperty(Model, 'riak', {
        enumerable: false,
        value: riak_lib
    });
    Model.prototype.connection = riak;

    // define primary key
    var pk_defined = false;
    for (var i in properties) {
        if (properties[i].primary) {
            pk_defined = true;
        }
    }
    if (!pk_defined) {
        properties[primary_key] = {type: String, primary: true};
    }

    // initializer
    Model.prototype.initialize = function (params, paramsOnly) {
        params = params || {};
        Object.keys(properties).forEach(function (attr) {
            var _attr = '_' + attr,
                attr_was = attr + '_was';

            if (paramsOnly && !params.hasOwnProperty(attr)) {
                return;
            }

            // Hidden property to store currrent value
            Object.defineProperty(this, _attr, {
                writable: true,
                enumerable: false,
                configurable: true,
                value: params[attr] !== undef ? params[attr] : (this[attr] !== undef ? this[attr] : null)
            });

            // Public setters and getters
            Object.defineProperty(this, attr, {
                get: function () {
                    return this[_attr];
                },
                set: function (value) {
                    this[_attr] = value;
                },
                configurable: true,
                enumerable: true
            });

            // Getter for initial property
            Object.defineProperty(this, attr_was, {
                get: function () {
                    return params[attr];
                },
                configurable: true,
                enumerable: false
            });
        }.bind(this));
    };

    /**
     * TODO doc
     * Create new object in storage
     */
    Model.create = function (params) {
        var callback = arguments[arguments.length - 1];
        if (arguments.length == 0 || params === callback) {
            params = {};
        }
        if (typeof callback !== 'function') {
            callback = function () {
            };
        }

        debug("create new " + model_name_lowercase + "");

        var self = new Model;
        if (pk_defined && !params.hasOwnProperty(primary_key)) {
            throw Error('Must specify primary key value for ' + primary_key);
        }

        if (!pk_defined && !params.hasOwnProperty(primary_key)) {
            params[primary_key] = uuid();
        }

        cache[params[primary_key]] = self;

        self.save(params, callback.bind(self, params[primary_key], self));
    };

    /**
     * TODO test
     * Find object in database
     * @param {Number} id identifier of record
     * @param {Function} callback(err) Function will be called after search
     *        it takes two arguments:
     *          - error
     *          - found object
     *          * applies to found object
     */
    Model.findById = Model.find = function (id, callback) {
        if (!id) {
            throw new Error(model_name + '.find(): `id` param required');
        }
        if (typeof callback !== 'function') {
            throw new Error(model_name + '.find(): `callback` param required');
        }

        // check cache
        if (cache[id]) {
            // ok, we got it, sync with database
            cache[id].reload(function () {
                callback.call(this, null, this);
            });
            return;
        }

        riak.get(table_name, id, function(err, data, meta) {
            var found = false;
            if (!err) {
                var obj = {};
                obj[primary_key] = id;
                Object.keys(properties).forEach(function (attr) {
                    found = true;
                    obj[attr] = castFromDatabase(properties, attr, data[attr]);
                });
                var object = new Model(obj);
                cache[id] = object;
                callback.call(found ? object : null, found ? null : true, found ? object : null);
            }
            else {
                callback.call(null, true);
            }
        });
    };

    /**
     * TODO document
     * Checks whether record with given id exists in database
     * @param id - primary id of record
     * @param callback - takes two params: err and exists (Boolean)
     */
    Model.exists = function (id, callback) {
        riak.exists(table_name, id, function (err, data, meta) {
            if (typeof callback == 'function') {
                callback(err, data);
            }
        });
    };

    // Define instance methods

    /**
     * Checks is property changed based on current property and initial value
     * @param {attr} String - property name
     * @return Boolean
     */
    Model.prototype.propertyChanged = function (attr) {
        return this['_' + attr] !== this[attr + '_was'];
    };

    /**
     * TODO test
     * Exports all defined properties to JSON
     * @return JSON string
     */
    Model.prototype.toJSON = function () {
        var data = {};
        Object.keys(properties).forEach(function (attr) {
            data[attr] = this[attr];
        }.bind(this));
        return JSON.stringify(data);
    };

    /**
     * Check whether object is new record
     * @return Boolean
     */
    Model.prototype.isNewRecord = function () {
        return !this[primary_key];
    };

    Model.prototype.reload = function (callback) { // TODO test, doc, refactor to do not use `new`
        if (this.isNewRecord()) {
            if (typeof callback == 'function') {
                callback.call(this, true);
            }
            return;
        }

        riak.get(table_name, id, function(err, data, meta) {
            if (!err) {
                throw err;
            }

            var obj = {};
            for (var attr in data) {
                obj[attr] = castFromDatabase(properties, attr, data[attr]);
            }

            this.initialize(obj);
            callback.call(this, err);
        }.bind(this));
    };

    /**
     * TODO test
     * Destroy record (delete from persistence)
     * @param callback -- function to call after operation
     *        takes two params:
     *          - err
     *          - succ
     */
    Model.prototype.destroy = function (callback) {
        riak.remove(table_name, this[primary_key], function(err, data, meta) {
            if (!err) {
                delete cache[this[primary_key]];
                delete this;
            }

            callback(err, data);
        }.bind(this));
    };

    Model.prototype.save = function (data, callback) {
        if (typeof data == 'function') {
            callback = data;
            data = {};
        }
        if (callback === undef) {
            callback = function () {
            };
        }

        if (data === undef) {
            data = {};
        }
        var currentDate = new Date;

        if (this.isNewRecord()) {
            var insertedProperties = {};
            Object.keys(properties).forEach(function (attr) {
                if (data[attr] !== undef) {
                    this[attr] = data[attr];
                }

                insertedProperties[attr] = castForDatabase(properties, attr, this[attr]);
            }.bind(this));

            if (properties.hasOwnProperty('created_at')) {
                this.created_at = currentDate;
                insertedProperties['created_at'] = castForDatabase(properties, 'created_at', this.created_at);
            }
            if (properties.hasOwnProperty('updated_at')) {
                this.updated_at = currentDate;
                insertedProperties['updated_at'] = castForDatabase(properties, 'updated_at', this.updated_at);
            }

            riak.save(table_name, this[primary_key], JSON.stringify(insertedProperties), function(err, data, meta) {
                callback.call(this, err);
            }.bind(this));

            return;
        }

        var updatedProperties = {};
        Object.keys(properties).forEach(function (attr) {
            if (data[attr] !== undef) {
                this[attr] = data[attr];
            }
            if (this.propertyChanged(attr)) {
                updatedProperties[attr] = castForDatabase(properties, attr, this[attr]);
            }
        }.bind(this));

        if (updatedProperties.length < 1) {
            callback.call(this, false);
            return;
        }

        if (properties.hasOwnProperty('updated_at')) {
            this.updated_at = currentDate;
            updatedProperties['updated_at'] = castForDatabase(properties, 'updated_at', this.updated_at);
        }

        riak.update(table_name, this[primary_key], JSON.stringify(updatedProperties), function(err, data, meta) {
            callback.call(this, err);
        }.bind(this));
    };

//    Model.prototype.updateAttribute = function accessor(attr, value, callback) {
//        debug(model_name + '[' + this[primary_key] + '].updateAttribute(' + attr + ')');
//        debug(value);
//
//        this[attr] = value;
//
//        if (typeof callback !== 'function') {
//            callback = function () {
//            };
//        }
//
//        if (this.propertyChanged(attr)) {
//            var updatedProperties = {};
//            updatedProperties[attr] = value;
//            if (properties.hasOwnProperty('updated_at')) {
//                this.updated_at = new Date;
//                updatedProperties['updated_at'] = this.updated_at;
//            }
//
//            riak.update(table_name, id, JSON.stringify(updatedProperties), function(err, data, meta) {
//                callback.call(this, err);
//            }.bind(this));
//        } else {
//            debug('property `' + attr + '` is not modified');
//            callback.call(this, false);
//        }
//    };

//    Model.all = function (callback) {
//        riak.keys(table_name, function (err, keys) {
//            callback.call(err, keys);
//        });
//    };

    Model.allInstances = function(options, callback) {
        riak.getAll(table_name, options, function (err, data, meta) {
            if (!err) {
                data = data || [];
                data.forEach(function (row, index) {
                    data[index] = Model.instantiate(row);
                });
            }

            callback.call(err, data);
        });
    };

    Model.instantiate = function (data) {
        if (!data.hasOwnProperty(primary_key)) {
            throw new Error('Only objects with an `' + primary_key + '` property can be instantiated');
        }

        if (cache[data[primary_key]]) {
            cache[data[primary_key]].initialize(data, true);
        } else {
            cache[data[primary_key]] = new Model(data);
        }
        return cache[data[primary_key]];
    };
};

