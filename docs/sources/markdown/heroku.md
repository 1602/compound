# Heroku

Heroku's Node.js hosting is available fo public usage now. Deploying a CompoundJS application is as simple as `git push`.

To work with heroku you also need `ruby` as well as the `heroku` gem.

### Deploying an application

First of all, create an application:

```
compound init heroku-app
cd heroku-app
sudo npm link
compound g crud post title content
```

Then initialize a git repository:

```
git init
git add .
git commit -m 'Init'
```

Create a Heroku application:

```
heroku create --stack cedar
```

Want to use MongoDB?

```
heroku addons:add mongohq:free
```

Want to use Redis?

```
heroku addons:add redistogo:nano
```

And deploy:

```
git push heroku master
```

Hook up Procfile (only once):

```
heroku ps:scale web=1
```

Check application state:

```
heroku ps
```

Visit your application:

```
heroku open
```

If something went wrong, you can check out the logs:

```
heroku logs
```

To access the CompoundJS REPL console, do:

```
heroku run compound console
```

MongoHQ provides a web interface for browsing your MongoDB database, to use it go to `http://mongohq.com/`, create an account, then click "Add remote connection" and configure the link to your database. You can retrieve defails required for the connection using this command:

```
heroku config --long
```