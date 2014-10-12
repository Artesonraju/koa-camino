'use strict';

var koa = require('koa'),
    http = require('http'),
    request = require('supertest'),
    should = require('should'),
    Router = require('..').Router;

var app;
var action;
var firstAction;
var secondAction;

function server(method, path, status, done){
  var serv = request(http.createServer(app.callback()));
  var req;
  if(method === 'GET'){
    req = serv.get(path);
  }
  if(method === 'POST'){
    req = serv.post(path);
  }
  req.expect(status)
  .end(function(err) {
    if (err){
      return done(err);
    }
    done();
  });  
}

describe('Routing configuration using routes', function() {
  describe('root and methods', function() {
    beforeEach(function(){
      app = koa();
      action = function*(){
        this.status = 200;
      };
    });
    it('wrong route description', function() {
        var buildRoute = function(){
        new Router().addRoute('dcdsvfd', action);
      };
      buildRoute.should.throw();
    });
    it('existing method', function(done) {
      app.use(new Router().addRoute('GET /', action).route);
      server('GET', '/', 200, done);
    });
    it('wrong method', function(done) {
      app.use(new Router().addRoute('GET /', action).route);
      server('POST', '/', 405, done);
    });
    it('wrong path', function(done) {
      app.use(new Router().addRoute('GET /', action).route);
      server('GET', '/path', 404, done);
    });
  });
  describe('segments', function() {
    beforeEach(function(){
      app = koa();
      action = function*(){
        this.status = 200;
      };
    });
    it('existing segment', function(done) {
      app.use(new Router().addRoute('GET /seg', action).route);
      server('GET', '/seg', 200, done);
    });
    it('wrong segment', function(done) {
      app.use(new Router().addRoute('GET /seg', action).route);
      server('GET', '/', 404, done);
    });
    it('wrong method on existing segment', function(done) {
      app.use(new Router().addRoute('POST /seg', action).route);
      server('GET', '/seg', 405, done);
    });
    it('linked segments', function(done) {
      app.use(new Router().addRoute('GET /first/second', action).route);
      server('GET', '/first/second', 200, done);
    });
    it('linked segments wrong path', function(done) {
      app.use(new Router().addRoute('GET /first/second', action).route);
      server('GET', '/first/', 404, done);
    });    
  });
  describe('parameters', function() {
    beforeEach(function(){
      app = koa();
    });
    it('parameter', function(done) {
      action = function*(){
        should(this.params.param).be.equal('foo');
        this.status = 200;
      };
      app.use(new Router().addRoute('GET /:param', action).route);
      server('GET', '/foo/', 200, done);
    });
    it('with segment', function(done) {
      action = function*(){
        should(this.params.param).be.equal('foo');
        this.status = 200;
      };
      app.use(new Router().addRoute('GET /seg/:param', action).route);
      server('GET', '/', 404, done);
    });
    it('multiple parameters', function(done) {
      action = function*(){
        should(this.params.first).be.equal('foo');
        should(this.params.second).be.equal('bar');
        this.status = 200;
      };
      app.use(new Router().addRoute('GET /:first/:second', action).route);
      server('GET', '/foo/bar', 200, done);
    });
  });
  describe('multiple routes', function() {
    beforeEach(function(){
      app = koa();
      firstAction = function*(){
        this.status = 200;
      };
      secondAction = function*(){
        this.status = 300;
      };
    });
    it('first route', function(done) {
      app.use(new Router()
              .addRoute('GET /foo/first', firstAction)
              .addRoute('GET /foo/second', secondAction)
              .route);
        server('GET', '/foo/first', 200, done);
    });
    it('second route', function(done) {
      app.use(new Router()
              .addRoute('GET /foo/first', firstAction)
              .addRoute('GET /foo/second', secondAction)
              .route);
        server('GET', '/foo/second', 300, done);
    });
    it('segment precedence over parameter', function(done) {
      app.use(new Router()
              .addRoute('GET /foo/:param', firstAction)
              .addRoute('GET /foo/seg', secondAction)
              .route);
        server('GET', '/foo/seg', 300, done);
    });
  });
});