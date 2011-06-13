require('./spec_helper').init exports

PORT = 3000

fs   = require 'fs'
path = require 'path'
http = require 'http'
exec = require('child_process').exec

testAppPath = path.resolve __dirname, '../tmp'
binRailway  = 'cd ' + testAppPath + ' && ' + path.resolve(__dirname, '../bin/railway') + ' '

exists = (test, aPath) ->
    test.ok path.existsSync(path.join(testAppPath, aPath)), 'Not exists: ' + aPath

visit = (path, cb) ->
    cli  = http.createClient PORT
    req  = cli.request 'GET', path, host: '127.0.0.1'
    body = ''
    req.addListener 'response', (res) ->
        res.addListener 'data', (chunk) -> body += chunk
        res.addListener 'end', () ->
            res.body = body
            cb(res)
    req.end()

post = (path, data, cb) ->
    cli  = http.createClient PORT
    headers =
        'Host':           '127.0.0.1'
        'Content-Type':   'application/x-www-form-urlencoded'
        'Content-Length': data.length

    req  = cli.request 'POST', path, headers
    body = ''
    req.addListener 'response', (res) ->
        res.addListener 'data', (chunk) -> body += chunk
        res.addListener 'end', () ->
            res.body = body
            cb(res)
    req.write(data)
    req.end()

checkApp = (test, appPath) ->
    wait = 7
    done = ->
        if --wait == 0
            app.close()
            test.done()

    appPath = appPath || ''
    process.cwd = () -> path.join(testAppPath, appPath)
    exec 'cd ' + process.cwd() + ' && ' + path.resolve(__dirname, '../bin/railway') + ' ' + 'g crud post title content date:date published:boolean', (err, out) ->
        module = require('module')
        module._cache = {}
        module._pathCache = {}
        require path.join(testAppPath, appPath, 'server')
        # app.settings.quiet = true
        app.listen PORT
        app.on 'listening', ->
            visit '/posts/new', (res) ->
                test.ok res.body.search('New post') != -1
                test.status200 res
                done()
            post '/posts', 'title=hello&content=world', (res) ->
                test.redirect res, '/posts', 'POST create'
                done()

                visit '/posts', (res) ->
                    test.ok res.body.search('Index of post') != -1
                    m = res.body.match /post #([\da-z]*)/
                    id = m[1]
                    test.status200 res, 'GET index'
                    done()

                    visit "/posts/#{id}", (res) ->
                        done()
                        test.status200 res, 'GET show'

                    visit "/posts/#{id}/edit", (res) ->
                        done()
                        test.status200 res, 'GET edit'

                    post "/posts/#{id}", '_method=PUT&title=42', (res) ->
                        test.redirect res, "/posts/#{id}"
                        done()

                        post "/posts/#{id}", '_method=DELETE', (res) ->
                            test.equal res.body, "'/posts'"
                            done()

# prepare tmp dir
cleanup = (done) ->
    exec 'rm -rf ' + testAppPath, ->
        fs.mkdir testAppPath, 0755, done

# collect test cases
cases = []
cases.push cmd: 'init test-app',   name: 'application with given name', path: 'test-app'
cases.push cmd: 'init --tpl jade', name: 'app using jade templating engine'
cases.push cmd: 'init',            name: 'application in current directory'
cases.push cmd: 'init --coffee',   name: 'coffee-script app'
cases.push cmd: 'init --db redis', name: 'app with redis datastore'
cases.push cmd: 'init --db redis --coffee', name: 'application in current directory'

# run test cases
cases.forEach (testCase) ->
    it 'should init ' + testCase.name, (test) ->
        cleanup ->
            console.log binRailway + testCase.cmd
            exec binRailway + testCase.cmd, (err, out, stderr) ->
                console.log out
                console.log stderr
                test.ok not err, 'Should be successful'
                checkApp test, testCase.path
