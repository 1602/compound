var redis_lib = require('./red-cli/lib/redis-client.js'),
    sys = require("sys"),
    undef;

redis_lib.debugMode = false;
var redis = redis_lib.createClient();

exports.debugMode = true;
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
        return data && data.id ? data.id.toString() : data ? data.toString() : '';
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

function add_persistence_methods(Model, namespace) {
    var model_name = Model.name;
    var model_name_lowercase = model_name.toLowerCase();

    Object.defineProperty(Model, 'connection', {
        enumerable: false,
        value: redis
    });
    Object.defineProperty(Model, 'redis', {
        enumerable: false,
        value: redis_lib
    });
    Model.prototype.connection = redis;

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


    Model.prototype.get = function (attr, callback) {
        var submodel_name = Model.attributes[attr];
        if (submodel_name == 'string' || submodel_name == 'int' || submodel_name == 'datetime') {
            callback(this[attr]);
            return;
        }
        if (namespace) {
            namespace[ucwords(submodel_name)].find(this[attr], function () {
                callback(this);
            });
        } else {
            this.connection.hgetall(submodel_name + ':' + this[attr], function (err, hash) {
                var new_hash = {};
                for (var i in hash) {
                    new_hash[i] = cast_type_from_db(Model, i, hash[i].toString());
                }
                callback(new_hash);
            });
        }
    };

    Model.prototype.to_hash = function () {
        var hash = {};
        for (var i in Model.attributes) {
            hash[i] = this[i];
        }
        return hash;
    };

    Model.prototype.reload = function (callback) {
        var self = this;
        if (!this.id) {
            if (typeof callback == 'function') {
                callback.apply(this, [true]);
            }
            return;
        }
        redis.hgetall(model_name_lowercase + ':' + self.id, function (err, hash) {
            var obj = {};
            for (var attr in hash) {
                obj[attr] = cast_type_from_db(Model, attr, hash[attr]);
            }
            var inst = Model.build(obj);
            inst.id = self.id;
            callback.call(inst, err);
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

exports.mixPersistMethods = function (Model, description) {
    var model_name           = description.className,
        model_name_lowercase = model_name.toLowerCase(),
        primary_key          = description.primaryKey || 'id',
        table_name           = description.tableName,
        properties           = description.properties,
        associations         = description.associations,
        scopes               = description.scopes;

    var cache = {};

    Object.defineProperty(Model, 'connection', {
        enumerable: false,
        value: redis
    });
    Object.defineProperty(Model, 'redis', {
        enumerable: false,
        value: redis_lib
    });
    Model.prototype.connection = redis;

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
    };

    // Define class methods

    Model.build = function () {
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
            callback = function () {};
        }

        debug("create new " + model_name_lowercase + "");

        var self = new Model;
        redis.incr('ids:' + model_name_lowercase, function (err, id) {
            if (!err) {
                debug("fetched next id for " + model_name_lowercase + ":" + id);
                cache[id] = self;
                self.id = id;
                params.id = id;
                if (properties.created_at) self.created_at = new Date;
                if (properties.updated_at) self.updated_at = new Date;
                self.save(params, callback.bind(self, id, self));
            } else {
                debug('can not fetch next id for ' + model_name_lowercase);
            }
        });
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

        // load new object
        redis.hgetall(model_name_lowercase + ':' + id, function (err, hash) {
            var found = false;
            if (!err) {
                var obj = {};
                obj.id = id;
                for (var attr in hash) {
                    found = true;
                    obj[attr] = castFromDatabase(properties, attr, hash[attr]);
                }
                var object = new Model(obj);
                cache[id] = object;
                callback.call(found ? object: null, found ? null : true, found ? object : null);
            } else {
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
        redis.exists(model_name_lowercase + ':' + id, function (err, exists) {
            if (typeof callback == 'function') {
                callback(exists);
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
        return !this.id;
    };

    Model.prototype.reload = function (callback) { // TODO test, doc, refactor to do not use `new`
        if (this.isNewRecord()) {
            if (typeof callback == 'function') {
                callback.call(this, true);
            }
            return;
        }
        redis.hgetall(model_name_lowercase + ':' + this.id, function (err, hash) {
            var obj = {};
            for (var attr in hash) {
                obj[attr] = castFromDatabase(properties, attr, hash[attr]);
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
        redis.del(model_name_lowercase + ':' + this.id, function (err, succ) {
            delete cache[this.id];
            delete this;
            callback(err, succ);
        }.bind(this));
    };

    Model.prototype.save = function (data, callback) {
        var wait = 0, error = false;
        if (typeof data == 'function') {
            callback = data;
            data = {};
        }
        if (callback === undef) {
            callback = function () {};
        }
        if (data === undef) {
            data = {};
        }

        if (this.isNewRecord()) {
            for (var i in data) {
                this[i] = data[i];
            }
            debug('new record, should fetch id first');
            Model.create(this, function (id) {
                callback.call(this, !id);
            });
            return;
        }

        if (properties.hasOwnProperty('updated_at')) this.updated_at = new Date;

        debug('saving ' + model_name_lowercase);

        Object.keys(properties).forEach(function (attr) {
            if (this[attr] !== undef || data[attr] !== undef) {
                ++wait;
                if (data[attr] !== undef) {
                    this[attr] = data[attr];
                }
                process.nextTick(function () {
                    this.updateAttribute(attr, this[attr], function (err) {
                        --wait;
                        error = error || err;
                        if (wait === 0) {
                            callback.call(this, error);
                        }
                    });
                }.bind(this));
            }
        }.bind(this));
    };

    Model.prototype.updateAttribute = function accessor(attr, value, callback) {
        debug(model_name + '[' + this.id + '].updateAttribute(' + attr + ')');
        debug(value);

        this[attr] = value;

        if (typeof callback !== 'function') {
            callback = function () {};
        }

        if (this.propertyChanged(attr)) {
            redis.hset(
                model_name_lowercase + ':' + this.id,
                attr,
                castForDatabase(properties, attr, value),
                function (err) {
                    var fix = {};
                    fix[attr] = value;
                    this.initialize(fix, true);
                    callback.call(this, err);
                }.bind(this)
            );
        } else {
            debug('property `' + attr + '` is not modified');
            callback.call(this, false);
        }
    };

    Model.all = function (callback) {
        redis.keys(model_name_lowercase + ':*', function (error, ids) {
            for (var i in ids) ids[i] = parseInt(ids[i].toString().split(':')[1], 10);
            callback.call(null, ids);
        });
    };

    // Model.all = function (options, callback) {
    //     if (arguments.length == 1) {
    //         callback = options;
    //         options = {};
    //     }
    //     var page = options.page || 0,
    //     shape_size = options.shape_size || 2;

    //     redis.get('ids:' + model_name_lowercase, function (err, value) {
    //         if (!value) {
    //             value = 0;
    //         }
    //         value = value.toString();
    //         if (value.length > shape_size) {
    //             var mask = value.slice(0, -shape_size);
    //             for (var i = 0; i < shape_size; i++) {
    //                 mask += '?';
    //             }
    //         } else {
    //             var mask = '*';
    //         }
    //         redis.keys(model_name_lowercase + ':' + mask, function (error, ids) {
    //             for (var i in ids) ids[i] = parseInt(ids[i].toString().split(':')[1], 10);
    //             callback.call(null, ids);
    //         });
    //     });
    // };

    Model.allInstances = Model.all_instances = function (options, callback) {
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
};
