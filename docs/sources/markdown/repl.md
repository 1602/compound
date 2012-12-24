# REPL console

To run the REPL console use this command:

```
compound console
```

or its shortcut:

```
compound c
```

The REPL console is   just a simple Node.js console with some CompoundJS, for example models.

Just one note on working with the console: Node.js is asynchronous by its nature which makes console debugging much more compilcated, since you have to use a callback to fetch results from the database for instance. We have added one useful method to simplify asynchronous debugging using the REPL console. It's called `c` and you can pass it as a parameter to any function that requires a callback. It will store the parameters passed to the callback to variables called `_0, _1, ..., _N` where N is the length of `arguments`.

Example:

```
compound c
compound> User.find(53, c)
Callback called with 2 arguments:
_0 = null
_1 = [object Object]
compound> _1
{ email: [Getter/Setter],
  password: [Getter/Setter],
  activationCode: [Getter/Setter],
  activated: [Getter/Setter],
  forcePassChange: [Getter/Setter],
  isAdmin: [Getter/Setter],
  id: [Getter/Setter] }
  
```

