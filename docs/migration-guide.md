## Migration guide from RailwayJS 1.0 to CompoundJS 1.1.3

### config/environment.js, config/environments/\*, and config/initializers

now should export function

```javascript
module.exports = function (compound) {
    var app = compound.app;
    var User = compound.models.User;
    // rest of file goes here
};
```

### app/models/\*

now should export function

```javascript
module.exports = function (compound, ModelName) {
    ModelName.validatesPresenceOf(...);
    ModelName.prototype.method = function () {
    };
};

### views

Avoid using `formTag` and `formFor` with blocks, new syntax:

<% var form = formFor(resource) %>
<%- form.begin() %>
<%- form.input('propertyname') %>
<%- form.submit() %>
<%- form.end() %>

### something else?

fix this file, request pull
