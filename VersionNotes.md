### v1.1.9-1
- fix issue where recursion in Controller.render() cleanParams() was not working properly

### v1.1.9
- Controller.render() will now check to see if the req.isAjax is true and if it is, then it will respond with json instead of rendering a view
- throw errors on any sensitive info detection in cleanParams() in render() function. Right now cleanParams is only called if the request isAjax. Sensitive info right now includes the following keys:
  - apiKey
  - api_key
  - password
  - passwordHash
  - password_hash

### v1.1.8-3
- prepend "_mobile_" to views and layouts if params.isMobile or params.isTablet detected
