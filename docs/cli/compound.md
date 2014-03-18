compound(1) -- MVC framework for NodeJS
=======================================

## SYNOPSIS

    compound <command> [args] [opts]

## DESCRIPTION

Compound is MVC framework for the Node JavaScript platform. It adds structure
and API to ExpressJS application, provides tools and generators for rapid
web applications development.

Run `compound help [topic]` to get help on specific topic.

### command

* `g`, `generate smth`:
  Call **smth** generator, where **smth** could be: app, controller, model, crud,
  scaffold or anything else.

* `r`, `routes`:
  Display routing map

* `s`, `server [port]`:
  Run HTTP server on specified port, default port = 3000

* `c`, `console`:
  Run debugging console with compound environment loaded

### opts

* `--coffee`
* `--tpl ENGINE`
* `--db NAME`
* `--stylus`

## ENVIRONMENT

* `NODE_ENV`:
  Set environment of application

* `PORT`:
  Set port of HTTP server

## FUTURE

See compound-roadmap(3) and [github issues][issues] to catch up current
development and see where compound going.

## BUGS

When you find issues, please report them:

* web:
  <http://github.com/1602/compound/issues>
* email:
  <compoundjs@googlegroups.com>

## HISTORY

See compound-changelog(3) compound-railway-changelog(3)

## AUTHOR

* [blog](http://anatoliy.in/)
* [github/1602](https://github.com/1602/)
* [github/anatoliychakkaev](https://github.com/anatoliychakkaev/)
* [twitter@1602](http://twitter.com/1602)
* <mail@anatoliy.in>

## SEE ALSO

compound(3)
