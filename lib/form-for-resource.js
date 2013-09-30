
var utils = require('./utils'),
    humanize = utils.humanize;

module.exports = FormForResource;

function FormForResource(res, formParams, path, hs) {
    this.__helpers = hs;
    this.__formParams = formParams;
    this.__app = hs.controller.app;
    this.__resourceName = res&& res.constructor && res.constructor.modelName || false;
    this.__res = res;
    this.__path = path || this.__resourceName;

    this.__complexNames = (this.__app.set('view options') || {}).complexNames;
    if (typeof this.__complexNames === 'undefined') {
        this.__complexNames = true;
    }
}

/**
 * Generates an id field
 *
 * @requires resourceName
 * @param {String} name Name of the element
 * @returns {String} returns the generated id name
 */
FormForResource.prototype.__makeId = function makeId(name, params) {
    if (params && params.id) {
        return params.id;
    }
    return this.__complexNames && this.__path ? ((this.__path + '_' + name).replace(/[\[\]_]+/g, '_').replace(/_$/, '')) : name;
};

/**
 * Generates a name
 *
 * @requires resourceName
 * @param {String} name Name of the element
 * @returns {String} returns the generated name
 */
FormForResource.prototype.__makeName = function makeName(name, params) {
    if (params && params.name) {
        return params.name;
    }
    return this.__complexNames && this.__path ? (this.__path + name.replace(/^([^\[]+)/, '[$1]')) : name;
};

/**
 * Opening form tag
 *
 * For formFor() calls without passing a block
 */
FormForResource.prototype.begin = function begin() {
    return this.__helpers.formTagBegin(this.__formParams || {});
};

/**
 * Closing form tag
 *
 * For formFor() calls without passing a block
 */
FormForResource.prototype.end = function end() {
    return this.__helpers.formTagEnd();
};

/**
 * Fields for nested resource
 *
 * @param {String} name - resource name
 *
 */
FormForResource.prototype.fieldsFor = function fieldsFor(name) {
    return new FormForResource(this.__res[name], this.__formParams, this.__path + '[' + name + ']', this.__helpers);
};

/**
 * Input tag helper
 *
 * Example in ejs:
 *
 *      <%- form.input("test") %>
 *
 * This returns:
 *
 *      <input name="test"/>
 *
 * @param {String} name Name of the element
 * @param {Object} params Additional parameters
 */
FormForResource.prototype.input = function (name, params) {
    params = params || {};
    if (params.type === undefined) {
        params.type = 'text';
    }
    if (params.value === undefined && params.type.toLowerCase() !== 'password') {
        params.value = typeof this.__res[name] !== 'undefined' ? this.__res[name] : '';
    }
    return this.__helpers.inputTag({
        name: this.__makeName(name, params),
        id: this.__makeId(name, params)
    }, params);
};

FormForResource.prototype.checkbox = function checkbox(name, params) {
    params = params || {};
    if (params.value === undefined) {
        params.value = this.__res[name] || 1;
    }
    if (params.checked === undefined) {
        if(this.__res[name]) {
            params.checked = 'checked';
        }
    } else if (params.checked === false) {
        delete params.checked;
    }
    return this.__helpers.inputTag({
        name: this.__makeName(name, params),
        id: this.__makeId(name, params),
        type: 'checkbox'
    }, params);
};

FormForResource.prototype.file = function file(name, params) {
    return this.__helpers.inputTag({
        name: this.__makeName(name, params),
        id: this.__makeId(name, params),
        type: 'file'
    }, params);
};

/*
 * Label helper
 *
 * Example in ejs:
 *
 *      <%- form.label("test", false, {class: "control-label"}) %>
 *
 * This returns:
 *
 *      <label for="test" class="control-label">Test</label>
 *
 * @param {String} name Name of the element
 * @param {String} caption Optional different caption of the elemt
 * @param {Object} params Additional parameters
 */
FormForResource.prototype.label = function label(name, caption, params) {
    if (typeof caption !== 'string') {
        if (!params) {
            params = caption;
        }
        var description = '';
        var model = this.__res.constructor.modelName;
        var ctl = this.__helpers.controller;
        var shortPath = 'models.' + model + '.fields.' + name;
        var long  = ctl.t(shortPath + '.label', '');

        if (long) {
            caption = long;
        } else {
            caption = ctl.t(shortPath, humanize(name));
        }

        description = ctl.t(shortPath + '.description', description);
        if (description) {
            caption += this.__helpers.icon('info-sign', {
                rel: 'popover',
                title: 'Help',
                'data-content': description
            });
        }
    }
    return this.__helpers.labelTag(
        caption,
        {for: this.__makeId(name, params) },
        params);
};

FormForResource.prototype.submit = function submit(name, params) {
    return this.__helpers.tag('button', name || 'Commit', {type: 'submit'}, params);
};

FormForResource.prototype.button = function button(name, params) {
    return this.__helpers.tag('button', name, params);
};

FormForResource.prototype.textarea = function textarea(name, params) {
    var value = params && 'value' in params ? params.value : this.__res[name] || '';
    return this.__helpers.textareaTag(this.__helpers.sanitize(value), {name: this.__makeName(name, params), id: this.__makeId(name, params)}, params);
};

/*
 * Provides a select tag
 *
 * In ejs:
 *
 *      <%- form.select("state", states, {fieldname: 'name', fieldvalue: '_id'}) %>
 *
 * Possible params:
 * * blank: {STRING} Blank value to be added at the beginning of the list
 * * fieldname: {STRING} Sets the name of the field in "options" field where the displayed values can be found. Default: "value"
 * * fieldvalue: {STRING} Sets the name of the field in "options" field where the submitted values can be found. Default = fieldname
 * * multiple: Can be set to false if size >1 to only select one value.
 * * select: Select a value. If fieldname and fieldvalue are different, the value is compared with fieldvalue otherwise with fieldname.
 * * size: Sets the displayed size of the select field
 *
 * @author [Uli Wolf](https://github.com/SirUli)
 * @param {String} name Name of the select tag
 * @param {Object} options Array of possible options
 * @param {Object} params Additional parameters
 */
FormForResource.prototype.select = function select(name, options, params) {
    options = options || [];
    params = params || {};

    // optional: Holds the displayed fieldname where the data can be found in 'options'
    var optionFieldname = params.fieldname || 'value';
    delete params.fieldname;

    // optional: Holds the submittable fieldvalue where the data can be found in 'options'
    var optionFieldvalue = params.fieldvalue || optionFieldname;
    delete params.fieldvalue;

    // optional: Holds the number of entries that can be seen at once
    // If size > 1, multiple values can be selected (can be switched off via multiple:false)
    // If size = 1, only one value is selectable (Drop-Down)
    if (params.size === undefined) {
        params.size = 1;
    } else {
        if (params.size > 1) {
            if (params.multiple === undefined || params.multiple === true) {
                params.multiple = 'multiple';
            } else {
                delete params.multiple;
            }
        }
    }

    // optional: Preselect an entry
    if (params.select === undefined) {
        params.select = this.__res[name] || '';
    }
    var optionSelected = params.select;
    delete params.select;

    // Render the options
    var innerOptions = '';

    // optional: Add a blank field at the beginning
    if (params.blank !== undefined) {
        innerOptions += this.__helpers.optionTag(this.__helpers.sanitize(params.blank), {value: ''});
    }

    for (var optionsNr in options) {
        var option = options[optionsNr];
        var optionParameters = {};

        // Is the value in a seperate field?
        if (option[optionFieldvalue] != option[optionFieldname]) {
            optionParameters.value = option[optionFieldvalue];
        }

        var actualValue, displayValue;
        if (typeof option === 'object') {
            actualValue = optionFieldname in option ? option[optionFieldvalue] : option;
            displayValue = optionFieldname in option ? option[optionFieldname] : option;
        } else {
            displayValue = actualValue = option + '';

        }

        if (activeValue(actualValue, optionSelected, options.matcher)) {
            optionParameters.selected = 'selected';
        }


        // Generate the option Tags
        innerOptions += this.__helpers.optionTag(this.__helpers.sanitize(displayValue), optionParameters);
    }
    // Render the select
    return this.__helpers.selectTag(innerOptions, {name: this.__makeName(name, params), id: this.__makeId(name, params)}, params);
};

/**
 * Compares a string against a string or an array
 *
 * @author [Uli Wolf](https://github.com/SirUli)
 * @param {String} value Content of the String to be compared
 * @param {String|Array} selectvalue String or Array of possiblities to be equal to the first string
 * @returns {Boolean} True if the string matches the other string or array. False when not.
 */
function activeValue(value, selectvalue, matcher) {
    var returnBool = false;

    // If this is an Array (e.g. when multiple values should be selected), iterate
    if (Object.prototype.toString.call(selectvalue) === '[object Array]') {
        // This is an Array (e.g. when multiple values should be selected), iterate
        for (var selectvalueNr in selectvalue) {
            // Cast to String as these might be objects.
            if (matcher) {
                if (matcher(value, selectvalue[selectvalueNr])) {
                    returnBool = true;
                }
            } else if (String(value) == String(selectvalue[selectvalueNr])) {
                returnBool = true;
                continue;
            }
        }
    } else {
        // This is just one entry
        // Cast to String as these might be objects.
        if (String(value) == String(selectvalue)) {
            returnBool = true;
        }
    }
    return returnBool;
}
