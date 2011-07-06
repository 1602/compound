console.log('hello from ejs-ext');
// monkey patch ejs
console.log(require.resolve('ejs'));
var ejs = require('ejs'), old_parse = ejs.parse;
ejs.parse = function () {
    var str = old_parse.apply(this, Array.prototype.slice.call(arguments));
    return str.replace('var buf = [];', 'var buf = []; arguments.callee.buf = buf;');
};

/**
 * This extension will be used by default for all template files
 */
exports.extension = '.ejs';

/**
 * Original templating engine
 */
exports.module = 'ejs';

/**
 * Get source template filename
 */
exports.template = function (name) {
    return __dirname + '/templates/' + name + '.ejs';
};

exports.templateText = function (name, data) {
    switch (name) {

        case 'default_action_view':
        return '<h1>' + data.join('#') + '</h1>\n';

        case 'scaffold_form':
        var form = '';
        data.forEach(function (property) {
            switch (property.type) {
                case 'Boolean':
                form += [
                    '<p>',
                    '  <%- form.checkbox("' + property.name + '") %>',
                    '  <%- form.label("' + property.name + '") %>',
                    '</p>'
                ].join('\n') + '\n';
                break;
                default:
                form += [
                    '<p>',
                    '  <%- form.label("' + property.name + '") %><br />',
                    '  <%- form.input("' + property.name + '") %>',
                    '</p>'
                ].join('\n') + '\n';
            }
        });
        return form;
    }
};
