compound-helpers(3) - view helpers
==================================

## DESCRIPTION

Helpers produce html code. [Built-in][BUILT-IN HELPERS] helpers available in any
view. Custom helpers available in specific controller, see [CUSTOM HELPERS][]
section.

## BUILT-IN HELPERS

### stylesheetLinkTag(file1[, file2[, ...[, fileN]]])

Generates `<link rel="stylesheets" href="..." />` tag.
Following ejs:

    <%- stylesheetLinkTag('reset', 'style', 'mobile') %>

will produce in develompent env:

    <link rel="stylesheet" type="text/css" href="/stylesheets/reset.css" />
    <link rel="stylesheet" type="text/css" href="/stylesheets/style.css" />
    <link rel="stylesheet" type="text/css" href="/stylesheets/mobile.css" />

and in production env:

    <link rel="stylesheet" type="text/css" href="/stylesheets/cache/somehash.css" />

depending on `app.set('merge stylesheets');` option.

### javascriptIncludeTag
### linkTo
### contentFor
### anchor
### matcher
### icon
### imageTag
### csrfTag
### csrfMetaTag
### metaTag
### formFor
### fieldsFor
### errorMessagesFor
### formTag
### formTagBegin
### formTagEnd
### labelTag
### submitTag
### buttonTag
### selectTag
### optionTag

## FORM HELPERS

### begin
### end
### label
### select
### input
### file
### textarea
### checkbox
### submit

## CUSTOM HELPERS

There are two kind of custom helpers: application-wide and controller-wide.
Application-wide helpers defined in `./app/helpers/application_helper.js` file.
Controller-wide helpers available only for specific controller, and should be
defined in `./app/helpers/controllerName_helper.js` file.

Each controller is a javascript file exports set of functions (helper methods).
These methods available in views and called on controller context, i.e. `this`
keyword inside helper method refers to controller, so that you can access every
member available in controller context: `req`, `res`, `body`, `compound`. To
access view context use `this.viewContext`.

## SEE ALSO

routing(3)
