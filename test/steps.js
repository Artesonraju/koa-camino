'use strict';

var koa = require('koa'),
    http = require('http'),
    request = require('supertest'),
    should = require('should'),
    Step = require('..').Step,
    Camino = require('..').Camino;

var app;
var action;

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

describe('Routing configuration using steps', function() {
  describe('with action and method', function() {
    beforeEach(function(){
      app = koa();
      action = function*(){
        this.status = 200;
      };
    });
    it('existing method', function(done) {
      var step = new Step({method: 'get', action: action});
      app.use(new Camino().addStep(step).route);
      server('GET', '/', 200, done);
    });
    it('wrong method', function(done) {
      var step = new Step({method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      server('POST', '/', 405, done);
    });
    it('wrong path', function(done) {
      var step = new Step({method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      server('GET', '/path', 404, done);
    });
  });
  describe('with segment', function() {
    beforeEach(function(){
      app = koa();
      action = function*(){
        this.status = 200;
      };
    });
    it('simple segment', function(done) {
      var step = new Step({segment: 'seg', method: 'get', action: action});
      app.use(new Camino().addStep(step).route);
      server('GET', '/seg', 200, done);
    });
    it('bad segment', function(done) {
      var step = new Step({segment: 'seg', method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      request(http.createServer(app.callback()));
      server('GET', '/bad', 404, done);
    });
    it('bad method', function(done) {
      var step = new Step({segment: 'seg', method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      request(http.createServer(app.callback()));
      server('POST', '/seg', 405, done);
    });
    it('multiple segments (first)', function(done) {
      var firstStep = new Step(
        {segment: 'first', method: 'GET', action: action}
      );
      var secondStep =
          new Step({segment: 'second', method: 'GET', action: action});
      app.use(new Camino().addStep(firstStep).addStep(secondStep).route);
      server('GET', '/first', 200, done);
    });
    it('multiple segments (second)', function(done) {
      var firstStep = new Step(
        {segment: 'first', method: 'GET', action: action}
      );
      var secondStep =
          new Step({segment: 'second', method: 'GET', action: action});
      app.use(new Camino().addStep(firstStep).addStep(secondStep).route);
      server('GET', '/second', 200, done);
    });   
    it('linked segments', function(done) {
      var firstStep = new Step({segment: 'first'});
      var secondStep =
          new Step({segment: 'second', method: 'GET', action: action});
      firstStep.append(secondStep);
      app.use(new Camino().addStep(firstStep).route);
      server('GET', '/first/second', 200, done);
    });
    it('linked segments multiple actions', function(done) {
      var firstAction = function*(){
        this.status = 300;
      };
      var firstStep = new Step(
        {segment: 'first', method:'get', action: firstAction }
      );
      var secondStep =
          new Step({segment: 'second', method: 'GET', action: action});
      firstStep.append(secondStep);
      app.use(new Camino().addStep(firstStep).route);
      server('GET', '/first', 300, done);
    });
    it('bad linked segments', function(done) {
      var firstStep = new Step({segment: 'first'});
      var secondStep =
          new Step({segment: 'second', method: 'GET', action: action});
      firstStep.append(secondStep);
      app.use(new Camino().addStep(firstStep).route);
      server('GET', '/first', 404, done);
    });
  });
  describe('with parameters', function() {
    beforeEach(function(){
      app = koa();
    });
    it('single parameter', function(done) {
      action = function*(){
        this.status = 200;
        should(this.params.param).be.equal('foo');
      };
      var step =
          new Step({parameter: 'param', method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      server('GET', '/foo', 200, done);
    });
    it('multiple parameters', function(done) {
      action = function*(){
        this.status = 200;
        should(this.params.first).be.equal('foo');
        should(this.params.second).be.equal('bar');
      };
      var firstStep = new Step({parameter: 'first'});
      var secondStep =
          new Step({parameter: 'second', method: 'GET', action: action});
      firstStep.append(secondStep);
      app.use(new Camino().addStep(firstStep).route);
      server('GET', '/foo/bar', 200, done);
    });
  });
  describe('complex configurations', function() {
    beforeEach(function(){
      app = koa();
    });
    it('one with all !', function(done) {
      action = function*(){
        should(this.params.param).be.equal('foo');
        this.status = 200;
      };
      var step =
          new Step(
            {segment: 'seg',
             parameter: 'param',
             method: 'GET',
             action: action});
      app.use(new Camino().addStep(step).route);
      request(http.createServer(app.callback()));
      server('GET', '/seg/foo', 200, done);
    });
    it('segments precedence over parameters', function(done) {
      var segAction = function*(){
        this.status = 200;
      };
      var paramAction = function*(){
        this.status = 300;
      };
      var segStep =
          new Step(
            {parameter: 'param',
             method: 'GET',
             action: paramAction});
      var paramStep =
          new Step(
            {segment: 'seg',
             method: 'GET',
             action: segAction});
      app.use(new Camino().addStep(paramStep).addStep(segStep).route);
      server('GET', '/seg', 200, done);
    });
    it('two parameters on same place', function() {
      var firstStep =
          new Step({parameter: 'first', method: 'GET', action: action});
      var secondStep =
          new Step({parameter: 'second', method: 'GET', action: action});
      var buildRouter = function(){
        new Camino().addStep(firstStep).addStep(secondStep);
      };
      buildRouter.should.throw();
    });
  });
  describe('empty segment or parameter', function() {
    beforeEach(function(){
      app = koa();
      action = function*(){
        this.status = 200;
      };
    });
    it('simple segment', function(done) {
      var step =
          new Step({segment: '', method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      server('GET', '//', 200, done);
    });
    it('root vs simple segment', function(done) {
      var step =
          new Step({segment: '', method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      server('GET', '/', 404, done);
    });
    it('linked segments', function(done) {
      var firstStep = new Step({segment: ''});
      var secondStep =
          new Step({segment: 'second', method: 'GET', action: action});
      firstStep.append(secondStep);
      app.use(new Camino().addStep(firstStep).route);
      server('GET', '//second/', 200, done);
    });
    it('simple parameter', function(done) {
      var step =
          new Step({parameter: 'param', method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      server('GET', '//', 200, done);
    });
    it('root vs simple parameter', function(done) {
      var step =
          new Step({parameter: 'param', method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      server('GET', '/', 404, done);
    });
    it('unnamed parameter', function() {
      var buildRouter = function(){
        var step =
          new Step({parameter: '', method: 'GET', action: action});
        new Camino().addStep(step);
      };
      buildRouter.should.throw();
    });
    
  });
  describe('with special characters', function() {
    beforeEach(function(){
      app = koa();
      action = function*(){
        this.status = 200;
      };
    });
    it('simple segment with space', function(done) {
      var step =
          new Step({segment: ' seg', method: 'GET', action: action});
      app.use(new Camino().addStep(step).route);
      server('GET', '/ seg/', 200, done);
    });
  });
});