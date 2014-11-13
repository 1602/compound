### v1.1.9-3
- update kontroller dependency to use forked version with custom protectFromForgery() that protects any 'GET's that are X-AJX or X-PJAX requests

### v1.1.9-2
- not allowing user object in cleanParams() is too strict. Remove that check, but keep remaining explicit checks for things like 'apiKey'.

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
