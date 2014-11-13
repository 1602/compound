### v1.1.9
- Controller.render() will now check to see if the req.isAjax is true and if it is, then it will respond with json instead of rendering a view

### v1.1.8-3
- prepend "_mobile_" to views and layouts if params.isMobile or params.isTablet detected
