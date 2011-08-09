var riak_lib = require('riak-js');
var uuid = require('node-uuid');
var sys = require("sys"),
    undef;

var riak = riak_lib.getClient();

exports.configure = function (config) {
    config.host = config.host || '127.0.0.1';
    config.port = config.port || 8098;

    riak = riak_lib.getClient(config);
};

function debug (m) {
    if (exports.debugMode) {
        sys.debug(m);
    }
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

            // Hidden property to store current value
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

     /**
     * TODO test
     * Insert/update model in a table in the database
     * @param {Object} data - initial property values
     * @param {Function} callback(error, model)
     */
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

                if (attr != primary_key)
                {
                    insertedProperties[attr] = this[attr];
                }
            }.bind(this));

            if (properties.hasOwnProperty('created_at')) {
                this.created_at = currentDate;
                insertedProperties['created_at'] = this.created_at;
            }
            if (properties.hasOwnProperty('updated_at')) {
                this.updated_at = currentDate;
                insertedProperties['updated_at'] = this.updated_at;
            }

            riak.save(table_name, this[primary_key], insertedProperties, function(error, data, meta) {
                callback.call(error, this);
            }.bind(this));

            return;
        }

        var updatedProperties = {};
        Object.keys(properties).forEach(function (attr) {
            if (data[attr] !== undef) {
                this[attr] = data[attr];
            }
            if (attr != primary_key && this.propertyChanged(attr)) {
                updatedProperties[attr] = this[attr];
            }
        }.bind(this));

        if (updatedProperties.length < 1) {
            callback.call(undef, this);
            return;
        }

        if (properties.hasOwnProperty('updated_at')) {
            this.updated_at = currentDate;
            updatedProperties['updated_at'] = this.updated_at;
        }

        riak.update(table_name, this[primary_key], updatedProperties, function(error, data, meta) {
            callback.call(error, this);
        }.bind(this));
    };

    /**
     * TODO test
     * Reload model from table in the database if necessary
     * @param {Function} callback(error, model)
     */
    Model.prototype.reload = function (callback) {
        if (this.isNewRecord()) {
            if (typeof callback == 'function') {
                callback.call(undef, this);
            }
            return;
        }
        var key = this[primary_key];
        riak.get(table_name, key, function(error, result, meta) {
            if (!error) {
                var record = result;
                record[primary_key] = key;

                var model = Model.instantiate(record);
                callback.call(error, model);
            }
            else {
                callback.call(error, null);
            }
        });
    };

    /**
     * TODO test
     * Returns all keys for a table in the database
     * @param {Function} callback(error, keys)
     */
    Model.all = function (callback) {
        riak.keys(table_name, function (error, keys) {
            callback.call(error, keys);
        });
    };

    /**
     * TODO test
     * Create new model for a table in the database
     * @param {Object} data - initial property values
     * @param {Function} callback(error, model)
     */
    Model.create = function (data, callback) {
        if (typeof data == 'function') {
            callback = data;
            data = {};
        }
        if (callback === undef) {
            callback = function () {};
        }

        debug("create new " + model_name_lowercase + "");

        var self = new Model;
        if (pk_defined && !data.hasOwnProperty(primary_key)) {
            throw Error('Must specify primary key value for ' + primary_key);
        }

        if (!pk_defined && !data.hasOwnProperty(primary_key)) {
            data[primary_key] = uuid();
        }

        cache[data[primary_key]] = self;
        self.save(data, callback);
    };

    /**
     * TODO test
     * Checks whether model with given key exists for a table in the database
     * @param {String} key identifier of record
     * @param {Function} callback(error, exists)
     */
    Model.exists = function (key, callback) {
        riak.exists(table_name, key, function (error, exists, meta) {
            if (typeof callback == 'function') {
                callback(error, exists);
            }
        });
    };


    /**
     * TODO test
     * Returns all models for a table in the database
     * @param {Function} callback(error, models)
     */
    Model.allInstances = function(callback) {
        riak.getAll(table_name, function (error, result, meta) {
            var models = [];
            if (!error) {
                result = result || [];
                result.forEach(function (row) {
                    var key = row['meta']['key'];
                    var record = row['data'];
                    record[primary_key] = key;

                    var model = Model.instantiate(record);
                    models.push(model);
                });
            }

            callback.call(error, models);
        });
    };

    /**
     * TODO test
     * Returns model for a table in the database
     * @param {String} key identifier of record
     * @param {Function} callback(error, model)
     */
    Model.findById = function (key, callback) {
        if (!key) {
            throw new Error(model_name + '.findById(): `key` param required');
        }
        if (typeof callback !== 'function') {
            throw new Error(model_name + '.findById(): `callback` param required');
        }

        // check cache
        if (cache[key]) {
            // ok, we got it, sync with database
            cache[key].reload(callback);
            return;
        }

        riak.get(table_name, key, function(error, result, meta) {
            if (!error) {
                var record = result;
                record[primary_key] = key;

                var model = Model.instantiate(record);
                callback.call(error, model);
            }
            else {
                callback.call(error, null);
            }
        });
    };


    /**
     * TODO test
     * Create new model
     * @param {Object} data - initial property values
     */
    Model.instantiate = function (data) {
        var key = data[primary_key];

        if (!key) {
            throw new Error(model_name + '.instantiate(): `'+ primary_key + '` param required');
        }

        if (cache[key]) {
            cache[key].initialize(data, false);
        } else {
            cache[key] = new Model(data);
        }
        return cache[key];
    };

     /**
     * TODO test
     * Removes a model from a table in the database
     * @param {Function} callback(error, success)
     */
    Model.destroy = function (callback) {
        riak.remove(table_name, this[primary_key], function(error, success, meta) {
            if (!error) {
                delete cache[this[primary_key]];
                delete this;
            }

            callback(error, success);
        }.bind(this));
    };

     /**
     * TODO test
     * Removes a model from a table in the database
     * @param {String} key identifier of record
     * @param {Function} callback(error, success)
     */
    Model.destroyById = function (key, callback) {
        riak.remove(table_name, key, function(error, success, meta) {
            if (!error) {
                var model = cache[key];

                if (model)
                {
                    delete cache[key];
                }
            }

            callback(error, success);
        });
    };
};