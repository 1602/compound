var mysql = require('mysql'),
    sys = require("sys"),
    undef;

var client = new mysql.Client;

exports.debugMode = false;
exports.useCache = false;

function ucwords(str) {
   str = str.split("_");

   for (i = 0; i < str.length; ++i) {
       str[i] = str[i].substring(0, 1).toUpperCase() + str[i].substring(1).toLowerCase();
   }

   return str.join('');
}

function debug (m) {
    if (exports.debugMode) {
        sys.debug(m);
    }
}

function dateToMysql (date) {
    if (!date) return '0000-00-00-00-00-00';
    // convert to UTC
    return [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getMinutes(),
        date.getSeconds()
    ].join('-');
}

function dateFromMysql (str) {
    var parts = str.split(/\D/),
    date = new Date;
    date.setUTCFullYear(parts[0]);
    date.setUTCMonth(parts[1] - 1);
    date.setUTCDate(parts[2]);
    date.setUTCHours(parts[3]);
    date.setMinutes(parts[4]);
    date.setSeconds(parts[5]);
    return date;
}

function addQuotes (str) {
    return '\'' + str.replace(/\\/g, '\\\\').replace(/'/g, '\\\'') + '\'';
}

function castForDatabase(properties, attr, data) {
    if (data === undef || data == null) return 'NULL';
    var type = properties[attr].type;
    switch (typeof type == 'function' ? type.name : type) {
    case 'json':
        return addQuotes(JSON.stringify(data));

    case 'Date':
        return addQuotes(dateToMysql(data));

    case 'String':
    case 'Number':
        return addQuotes(data.toString());

    case 'Boolean':
        return data ? '1' : '0';
    default:
        return data && data.id ? data.id.toString() : data ? data.toString() : '';
    }
}

function castFromDatabase(properties, attr, data) {
    var type = properties[attr].type;
    switch (typeof type == 'function' ? type.name : type) {
    case 'Number':
        data = parseInt(data, 10);
        break;
    case 'Date':
        if (data == '') data = null;
        break;
    case 'String':
        data = (data || '').toString();
        break;

    case 'Boolean':
        if (data == 'true' || data == 'on') {
            data = true;
        } else if (data == 'false' || data == 'off') {
            data = false;
        } else {
            data = !!data;
        }
        break;
    case 'json':
        try {
            data = JSON.parse(data.toString('utf-8'));
        } catch(e) {
            console.log('ERROR PARSING JSON:', data.toString('binary'));
            throw e;
        }
        break;
    }
    return data;
}

function add_persistence_methods(Model, model_name, namespace) {
    var model_name_lowercase = model_name.toLowerCase();

    Model.connection = client;
    Model.mysql = mysql;
    Model.prototype.connection = client;

    Model.build = function (params) {
        if (typeof params !== 'object') params = {};
        var self = new Model;
        for (var attr in Model.attributes) {
            (function (attr) {
                Object.defineProperty(self, '_' + attr, {
                    writable: true,
                    enumerable: false,
                    value: params[attr] !== undef ? params[attr] : (self[attr] !== undef ? self[attr] : null)
                });
                Object.defineProperty(self, attr, {
                    get: function () {
                        return self['_' + attr];
                    },
                    set: function (value) {
                        self['_' + attr] = value;
                    },
                    enumerable: true
                });
                Object.defineProperty(self, attr + '_was', {
                    get: function () { return params[attr]; },
                    enumerable: false
                });
            })(attr);
        }
        return self;
    };

    Model.all = function (options, callback) {
        if (arguments.length == 1) {
            callback = options;
            options = {};
        }
        var page = options.page || 0,
        shape_size = options.shape_size || 2;

        redis.get('ids:' + model_name_lowercase, function (err, value) {
            if (!value) {
                value = 0;
            }
            value = value.toString();
            if (value.length > shape_size) {
                var mask = value.slice(0, -shape_size);
                for (var i = 0; i < shape_size; i++) {
                    mask += '?';
                }
            } else {
                var mask = '*';
            }
            redis.keys(model_name_lowercase + ':' + mask, function (error, ids) {
                for (var i in ids) ids[i] = parseInt(ids[i].toString().split(':')[1], 10);
                callback.call(null, ids);
            });
        });
    };

    Model.all_instances = function (options, callback) {
        if (arguments.length == 1) {
            callback = options;
            options = {};
        }
        var result = [];
        Model.all(function (ids) {
            var count = ids ? ids.length : 0;
            if (count > 0) {
                for (var i in ids) {
                    Model.find(ids[i], function () {
                        result.push(this);
                        count -= 1;
                        if (count == 0) {
                            if (options.order) {
                                if (typeof options.order == 'function') {
                                    result.sort(options.order);
                                } else {
                                    result.sort(function (a, b) {
                                        return a[options.order] > b[options.order];
                                    });
                                }
                            }
                            callback(result);
                        }
                    });
                }
            } else {
                callback([]);
            }
        });
    };

    Model.find_or_create = function (id, callback) {
        Model.exists(id, function (exists) {
            if (exists) {
                Model.find(id, callback);
            } else {
                var obj = Model.build();
                obj.id = id;
                obj.created_at = new Date;
                obj.save(callback);
            }
        });
    };

    Model.update_or_create = function (data, callback) {
        Model.exists(data.id, function (exists) {
            if (exists) {
                Model.find(id, function () {
                    this.save(data, function () {
                        callback.call(this);
                    });
                });
            } else {
                Model.create(data, function () {
                    callback.call(this);
                });
            }
        });
    };
}

exports.configure = function (config) {
    ['user', 'password', 'database', 'host', 'post'].forEach(function (f) {
        if (config[f]) {
            client[f] = config[f];
        }
    });
};

exports.mixPersistMethods = function (Model, model_name, properties, associations) {
    // TODO: underscorize
    var model_name_lowercase = model_name.toLowerCase();
    var cache = {};


    Model.connection = client;
    Model.mysql = mysql;
    Model.prototype.connection = client;

    function dbQuery (query, callback) {
        var start;
        if (!query) {
            throw new Error('Query should be a string');
        }
        if (!dbQuery.connected) {
            var args = Array.prototype.slice.call(arguments);
            dbQuery.connected = true;
            start = new Date;
            Model.connection.connect(function (err) {
                if (!err) {
                    console.log('mysql connected in ' + (new Date - start) + 'ms');
                    dbQuery.apply(this, args);
                } else {
                    console.log(arguments);
                    throw new Error('Could not connect to mysql server');
                }
            });
            return;
        }
        start = new Date;
        Model.connection.query(query, function (err) {
            console.log('SQL Query [' + (new Date - start) + 'ms]: ' + query.replace(/\s+/g, ' '));
            callback.apply(this, Array.prototype.slice.call(arguments));
        });
    }

    // define primary key
    var pk_defined = false;
    for (var i in properties) {
        if (properties[i].primary) {
            pk_defined = true;
        }
    }
    if (!pk_defined) {
        properties['id'] = {type: Number, primary: true};
    }

    // initializer
    Model.prototype.initialize = function (params, paramsOnly) {
        params = params || {};
        Object.keys(properties).forEach(function (attr) {
            var _attr    = '_' + attr,
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
                get: function () { return params[attr]; },
                configurable: true,
                enumerable: false
            });
        }.bind(this));

        if (this.id) cache[this.id] = this;
    };

    // Define class methods
    // ====================

    /**
     * TODO doc
     * Create new object in storage
     */
    Model.create = function (params) {
        var callback = arguments[arguments.length - 1];
        debug("create new " + model_name_lowercase + "");
        var self = new Model;
        if (properties.created_at) self.created_at = new Date;
        if (properties.updated_at) self.updated_at = new Date;
        self.save(params, callback);
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
    Model.find = function (id, callback) {
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

        // load new object
        dbQuery(
            'SELECT * FROM `' + model_name_lowercase + '` WHERE `id` = ' + id + ' LIMIT 1',
            function (err, results, fields) {
                var found = false;
                if (!err && results.length == 1) {
                    var obj = {};
                    obj.id = id;
                    Object.keys(properties).forEach(function (attr) {
                        found = true;
                        obj[attr] = castFromDatabase(properties, attr, results[0][attr]);
                    });
                    var object = new Model(obj);
                    cache[id] = object;
                    callback.call(found ? object: null, found ? null : true, found ? object : null);
                } else {
                    callback.call(null, true);
                }
            }
        );
    };

    /**
     * TODO document
     * Checks whether record with given id exists in database
     * @param id - primary id of record
     * @param callback - takes two params: err and exists (Boolean)
     */
    Model.exists = function (id, callback) {
        dbQuery('SELECT 1 FROM `' + model_name_lowercase + '` WHERE id = ' + id + ' LIMIT 1', function (err, data) {
            callback(data && data[0]);
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
        return !this.id;
    };

    Model.prototype.reload = function (callback) { // TODO test, doc, refactor to do not use `new`
        if (this.isNewRecord()) {
            if (typeof callback == 'function') {
                callback.call(this, true);
            }
            return;
        }
        dbQuery(
            'SELECT * FROM `' + model_name_lowercase + '` WHERE `id` = ' + this.id + ' LIMIT 1',
            function (err, data) {
                var obj = {}, hash = data[0];
                Object.keys(properties).forEach(function (attr) {
                    obj[attr] = castFromDatabase(properties, attr, hash[attr]);
                });
                this.initialize(obj);
                callback.call(this, err);
            }.bind(this)
        );
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
        dbQuery('DELETE FROM `' + model_name_lowercase + '` WHERE `id` = ' + this.id + ' LIMIT 1', function (err, succ) {
            if (!err) {
                delete cache[this.id];
                delete this;
            }
            callback(err, succ);
        }.bind(this));
    };

    Model.prototype.save = function (data, callback) {
        var wait = 0, error = false, fields = Object.keys(properties), values = [];
        if (typeof data == 'function') {
            callback = data;
            data = {};
        }
        if (callback === undef) {
            callback = function () {};
        }

        if (this.isNewRecord()) {
            for (var i in data) {
                this[i] = data[i];
            }
            fields.forEach(function (val) {
                var value = castForDatabase(properties, val, this[val]);
                values.push(value);
            }.bind(this));

            dbQuery(
                'INSERT INTO `' + model_name_lowercase + '`\
                (`' + fields.join('`,`') + '`)\
                VALUES (' + values.join(",") + ')',
                function (err, info) {
                    this.initialize({id: info.insertId}, true);
                    callback.call(this, info.insertId);
                }.bind(this)
            );
            return;
        }

        debug('saving ' + model_name_lowercase);

        var fixes = {}, update = [];

        data.updated_at = new Date;

        Object.keys(properties).forEach(function (attr) {
            if (data[attr] !== undef) {
                this[attr] = data[attr];
            }
            if (this.propertyChanged(attr)) {
                fixes[attr] = this[attr];
                update.push('`' + attr + '`' + ' = ' + (
                    castForDatabase(properties, attr, this[attr])
                ));
            }
        }.bind(this));

        dbQuery(
            'UPDATE `' + model_name_lowercase + '`\
            SET ' + update.join(',') + '\
            WHERE `id` = ' + this.id + '\
            LIMIT 1', function (err, result) {
                this.initialize(fixes, true);
                callback.call(this, err);
            }.bind(this)
        );
    };

    Model.prototype.update_attribute = function accessor(attr, value, callback) {
        debug(model_name + '[' + this.id + '].update_attribute(' + attr + ')');

        this[attr] = value;

        if (typeof callback !== 'function') {
            callback = function () {};
        }

        if (this.propertyChanged(attr)) {
            var update = [], fixes = {};
            if (properties.updated_at) {
                fixes.updated_at = new Date;
                update.push('`updated_at` = ' + castForDatabase(properties, 'updated_at', fixes.updated_at));
            }
            fixes[attr] = this[attr];
            update.push('`' + attr + '` = ' + castForDatabase(properties, attr, this[attr]));
            dbQuery(
                'UPDATE `' + model_name_lowercase + '`\
                SET ' + update.join(',') + '\
                WHERE `id` = ' + this.id + '\
                LIMIT 1', function (err, result) {
                    this.initialize(fixes, true);
                    callback.call(this, err);
            }.bind(this));
        } else {
            debug('property `' + attr + '` is not modified');
            callback.call(this, true);
        }
    };

    ['first', 'second', 'third'].forEach(function (name, index) {
        Model[name] = function (callback) {
            dbQuery('SELECT * FROM `' + model_name_lowercase + '` ORDER BY `id` LIMIT ' + (index + 1), function (err, data) {
                var instance = null;
                if (data && data[index]) {
                    instance = Model.instantiate(data[index]);
                }
                callback(instance);
            });
        };
    });

    Model.last = function (callback) {
        dbQuery('SELECT * FROM `' + model_name_lowercase + '` ORDER BY `id` DESC LIMIT 1', function (err, data) {
            var instance = Model.instantiate(data[0]);
            callback(instance);
        });
    };

    Model.all_instances = Model.all = function (options) {
        var callback = arguments[arguments.length - 1];
        if (typeof callback !== 'function') {
            callback = function () {};
        }
        dbQuery('SELECT * FROM `' + model_name_lowercase + '`', function (err, data) {
            data = data || [];
            data.forEach(function (row, index) {
                data[index] = Model.instantiate(row);
            });
            callback(data);
        });
    };

    Model.instantiate = function (data) {
        var id = data.id;
        if (!id) {
            throw new Error('Only objects with an `id` property can be instantiated');
        }
        if (cache[id]) {
            cache[id].initialize(data, true);
        } else {
            cache[id] = new Model(data);
        }
        return cache[id];
    };
};
