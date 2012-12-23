# Localization

Basic steps:

* Create dictionary to translate tokens into natural language (`config/locales/*.yml`)
* Use tokens instead of natural language everywhere in your app (`t` helper)
* Manually detect language for each request (`setLocale` method)

CompoundJS allows you to create localized applications: Just place a `YAML`-formatted file to `config/locales` directory:

`config/locales/en.yml`
```
en:
  session:
    new: "Sign in"
    destroy: "Sign out"
  user:
    new: "Sign up"
    destroy: "Cancel my account"
    welcome: "Hello %, howdy?
    validation:
      name: "Username required"
      
```

NOTE: Translations can contain `%` symbol(s) for variable substitution.

Define a user locale before filter to your application controller:

`app/controllers/application_controller.js`
```
before(setUserLocale);
function setUserLocale () {
    // define locale from user settings, or from headers or use default
    var locale = req.user ? req.user.locale : 'en';
    // call global function setLocale
    setLocale(locale);
}
```

And use localized tokens inside your app views using the `t` helper:

```
<%= t('session.new') %>
<%= t('user.new') %>
<%= t(['user.welcome', user.name]) %>
```

You can also use the `t` helper in controllers:

```
flash('error', t('user.validation.name'));
```

or in models:

```
return t('email.activate', 'en')
```

NOTE: When you use the `t` helper in models, you have to pass the `locale` as the second parameter.

## Configuration

Localization behavior can be configured using the following settings:

* `defaultLocale`: Default locale name
* `translationMissing`: Defines what action to perform when translation is missing. Possible Values:
<ul>
<li>`default` - Display translation for default locale</li>
<li>`display` - Show an error like "Translation missing for email.activate"</li>
</ul>
* `default` - Display translation for default locale
* `display` - Show an error like "Translation missing for email.activate"

Example:

```
app.configure(function () {
    app.set('defaultLocale', 'en');
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.set('translationMissing', 'display');
});

app.configure('production', function () {
    app.use(express.errorHandler()); 
    app.set('translationMissing', 'default');
});
```
