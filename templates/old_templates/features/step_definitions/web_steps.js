var server  = require('../../server'),
    browser = new Browser(server),
    http    = require('http'),
    assert  = require('assert'),
    Steps   = require('cucumis').Steps,
    jsdom   = require('jsdom'),
    jquery  = require('./jquery');

server.settings.quiet = true;
Steps.browser = browser;

assert.statusCode = function (code) {
    assert.equal(browser.response.statusCode, code,
        'Response should have statusCode ' + code + 
        ', but ' + browser.response.statusCode + ' got');
}

assert.flash = function (class, message) {
    var actual = browser.$('.' + class).text();
    assert.equal(actual, message, "Response should contain \"" + message + "\" but it doesn't, actual: '" + actual + "'");
}

assert.dontFlash = function (class, message) {
    var actual = browser.$('.' + class).text();
    if (actual == message) {
        assert.fail("Response should not contain \"" + message + "\" but it is contain");
    }
}

assert.contain = function (text) {
    assert.ok(browser.response.body.indexOf(text) != -1, 
        "Response body does not contain '" + text + "': " + browser.response.body);
}

Steps.Given(/^server running on port (\d+)$/, function (ctx, port) {
    if (!server.fd) {
        server.listen(server.__port = port, '127.0.0.1');
        server.client = http.createClient(server.__port);
    }
    setTimeout(ctx.done, 100);
});

Steps.When(/^I go to path "([^"]*?)"$/, function (ctx, path) {
    browser.get(path, ctx.done);
});

Steps.Then(/^I should be redirected to "([^"]*?)"$/, function (ctx, path) {
    assert.statusCode(302);
    assert.equal(browser.response.headers.location, path, 'Expected header "location": ' + path + ', but headers are: ' + JSON.stringify(browser.response.headers));
    browser.get(path, ctx.done);
});

Steps.When(/^I?\s?click button "([^"]*?)"$/, function (ctx, text) {
    browser.clickButton(text, ctx.done);
});

Steps.When(/^I?\s?fill in "([^"]*?)" with "([^"]*?)"$/, function (ctx, name, value) {
    browser.$('input[name=' + name + ']').val(value.replace('(at)', '@'));
    ctx.done();
});

Steps.Then(/^I?\s?should see flash ([^\s]+) message "([^"]*?)"$/, function (ctx, class, message) {
    assert.statusCode(200);
    assert.flash(class, message);
    ctx.done();
});

Steps.Then(/^I?\s?should not see flash ([^\s]+) message "([^"]*?)"$/, function (ctx, class, message) {
    assert.statusCode(200);
    assert.dontFlash(class, message);
    ctx.done();
});

Steps.Then(/^I?\s?should see "([^"]*?)"$/, function (ctx, text) {
    assert.statusCode(200);
    assert.contain(text);
    ctx.done();
});

Steps.Given(/^clear cookies in browser$/, function (ctx) {
    browser.cookie = '';
    ctx.done();
});

Steps.Then(/^clear cookies in browser$/, function (ctx) {
    browser.cookie = '';
    ctx.done();
});

Steps.Then(/^shutdown server$/, function (ctx) {
    server.close();
    ctx.done();
});

Steps.export(module);

function Browser (server) {
    this.server = server;
    this.cookie = '';
}

Browser.prototype.get = function (path, callback) {
    this.request('GET', path, null, callback);
};

Browser.prototype.submitForm = function ($form, callback) {
    var action = $form.attr('action') || this.url,
        method = $form.attr('method') || 'GET',
        params = $form.serialize();

    this.request(method.toUpperCase(), action, params, callback);
};

Browser.prototype.request = function (method, path, data, callback) {
    var client = this.server.client;
    var headers = {};
    if (data) {
        headers['Content-Length'] = data.length;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    if (this.cookie) {
        headers.Cookie = this.cookie;
    }
    this.url = path;
    var request = client.request(method, path, headers);

    request.addListener('response', function (response) {
        this.response = response;
        if (response.headers['set-cookie']) {
            this.cookie = response.headers['set-cookie'][0].split(';')[0];
        }
        response.body = '';
        response.setEncoding('utf8');
        response.addListener('data', function (chunk) { response.body += chunk; });
        response.addListener('end', function () {
            this.response = response;
            this.window = jsdom.jsdom(normalize(response.body), null, {
                features: {
                    FetchExternalResources: false,
                    ProcessExternalResources: false
                }
            }).createWindow();
            this.$ = jquery.create(this.window);
            callback();
        }.bind(this));
    }.bind(this));
    if (data) {
        request.write(data);
        console.log(data);
    }
    request.end();
};

Browser.prototype.fillIn = function (name, value) {
    this.$('input[name=' + name + ']').val(value.replace('(at)', '@'));
};

Browser.prototype.clickButton = function (text, done) {
    var $button = browser.$('input[type=submit][value=' + text + ']');
    if ($button[0]) {
        browser.submitForm($button.parent('form'), done);
    } else {
        console.log(browser.response.body);
        assert.fail("Can not find button");
        done();
    }
};

function normalize(html) {
  if (!~html.indexOf('<body')) html = '<body>' + html + '</body>';
  if (!~html.indexOf('<html')) html = '<html>' + html + '</html>';
  return html;
}

function response (server, req, res, msg) {
    // Callback as third or fourth arg
    var callback = typeof res === 'function'
    ? res
    : typeof msg === 'function'
    ? msg
    : function(){};

    // Default messate to test title
    if (typeof msg === 'function') msg = null;
    msg = msg || assert.testTitle;
    msg += '. ';

    // Pending responses
    server.__pending = server.__pending || 0;
    server.__pending++;

    // Create client
    if (!server.fd) {
        server.listen(server.__port = port++, '127.0.0.1');
        server.client = http.createClient(server.__port);
    }

    // Issue request
    var timer,
    client = server.client,
    method = req.method || 'GET',
    status = res.status || res.statusCode,
    data = req.data || req.body,
    requestTimeout = req.timeout || 0;

    var request = client.request(method, req.url, req.headers);

    // Timeout
    if (requestTimeout) {
        timer = setTimeout(function(){
            --server.__pending || server.close();
            delete req.timeout;
            assert.fail(msg + 'Request timed out after ' + requestTimeout + 'ms.');
        }, requestTimeout);
    }

    if (data) request.write(data);
    request.addListener('response', function(response){
        response.body = '';
        response.setEncoding('utf8');
        response.addListener('data', function(chunk){ response.body += chunk; });
        response.addListener('end', function(){
            --server.__pending || server.close();
            if (timer) clearTimeout(timer);

            // Assert response body
            if (res.body !== undefined) {
                var eql = res.body instanceof RegExp
                ? res.body.test(response.body)
                : res.body === response.body;
                assert.ok(
                    eql,
                    msg + 'Invalid response body.\n'
                    + '    Expected: ' + sys.inspect(res.body) + '\n'
                    + '    Got: ' + sys.inspect(response.body)
                );
            }

            // Assert response status
            if (typeof status === 'number') {
                assert.equal(
                    response.statusCode,
                    status,
                    msg + colorize('Invalid response status code.\n'
                    + '    Expected: [green]{' + status + '}\n'
                    + '    Got: [red]{' + response.statusCode + '}')
                );
            }

            // Assert response headers
            if (res.headers) {
                var keys = Object.keys(res.headers);
                for (var i = 0, len = keys.length; i < len; ++i) {
                    var name = keys[i],
                    actual = response.headers[name.toLowerCase()],
                    expected = res.headers[name],
                    eql = expected instanceof RegExp
                    ? expected.test(actual)
                    : expected == actual;
                    assert.ok(
                        eql,
                        msg + colorize('Invalid response header [bold]{' + name + '}.\n'
                        + '    Expected: [green]{' + expected + '}\n'
                        + '    Got: [red]{' + actual + '}')
                    );
                }
            }

            // Callback
            callback(response);
        });
    });
    request.end();
};
