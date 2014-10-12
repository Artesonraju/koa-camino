# koa-camino

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]

Koa router


## Installation

```sh
$ npm install name
```


## Seting up a router

```js
var koa = require('koa'),
    Router = require('koa-camino').Router,
    Step = require('koa-camino').Step;
var app = koa();
var router = new Router();

/* Configure router */

app.use(router.route);

```


## Configre using steps

A Step can contain :
  A segment (of the url path)
  ```js
  var seg = new Step({segment: 'seg'});
  ``` 
  A parameter : corresponding to a some aritrary string in the url path
  ```js
  var seg = new Step({parameter: 'param'});
  ``` 
  A HTTP method and an action to be processed
  ```js
  var step = new Step({method: 'GET', action: function*(next){}});
  ```
  A composition of the last three
  ```js
  var step = new Step({segment: 'seg', parameter: 'param', method: 'GET', action: function*(next){}});
  ```

If a step contains a segment and a parameter, it corresponds to a path containing the segment first and then the parameter

Link steps to build an arboresence corresponding to the routes :
```js
parentStep.append(step);
```
Returns the parent step to allow to chain 'append' calls

Configure the router with the step root of the arboresence
```js
router.addStep(users);
```
'addStep' calls are chainabe


## Configure using routes

Using a more classical way, without arborescence...

```js
router.addRoute('POST /users/:id/get', function*(next){});
```
'addRoute' calls are chainabe


## License

  MIT

[npm-image]: https://img.shields.io/npm/v/koa-camino.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-camino
[travis-image]: https://img.shields.io/travis/Artesonraju/koa-camino.svg?style=flat-square
[travis-url]: https://travis-ci.org/Artesonraju/koa-camino
[coveralls-image]: https://img.shields.io/coveralls/Artesonraju/koa-camino.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/Artesonraju/koa-camino?branch=master
[david-image]: http://img.shields.io/david/Artesonraju/koa-camino.svg?style=flat-square
[david-url]: https://david-dm.org/Artesonraju/koa-camino
[license-image]: http://img.shields.io/npm/l/koa-camino.svg?style=flat-square
[license-url]: LICENSE