'use strict';

var koa = require('koa'),
    Router = require('koa-camino').Router,
    Step = require('koa-camino').Step;

/* Initializing koa application and router */
var app = koa();
var router = new Router();

var action = function*(next){
  /* ... */
};

/* Add routes using Step objects */
var users = new Step({segment: 'users'});
var id = new Step({parameter: 'id', method: 'GET', action: action});

users.append(id);

router.addStep(users);

/* Add routes directly */
router.addRoute('POST /users/:id', action);

/* Adding the router to the app */
app.use(router.route);
