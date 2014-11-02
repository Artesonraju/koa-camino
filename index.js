'use strict';

var assert = require('assert');

/**
 * Element of the arborescence used to configure the Camino objects
 * contains a segment (string) and/or a parameter (non empty string)
 * and/or an http method and an action (generator)
 * @param {Object} config 
 */
function Step(config) {
  // config contains a segment, a non null parameter, or a metthod and an action
  assert(config.segment || config.segment === '' ||
         config.parameter || (config.method && config.action),
    'a step configuration needs at least one of segment,' +
    'parameter, or method and action');
  assert((config.method && config.action) || (!config.method && !config.action),
    'a step that contains method must also contain an action and vice versa');
  assert(config.parameter !== '', 'a parameter must have a name');
  // assert the method is an http method
  assert(!config.method ||
         config.method.match(/(GET|HEAD|POST|PUT|DELETE|TRACE|OPTIONS|PATCH|CONNECT)/i));
  this.segment = config.segment;
  this.method = config.method;
  this.action = config.action;
  this.parameter = config.parameter;
  this._substeps = [];
}

/**
 * Append a step to another one
 * @param   {Step} step to be append
 * @returns {Step} father step
 */
Step.prototype.append = function(step){
  
  if(!step instanceof Step){
    step = new Step(step);
  }
  this._substeps.push(step);
  return this;
};

/**
 * Element of the internal arborescence used by Camino object
 * contains a segment (string) and/or a parameter (non empty string)
 * and/or an http method and an action (generator)
 */
function Router(){
  this.segments = new Map();
  this.methods = new Map();
}

/**
 * Add a route to a Router (internal use only)
 * @param   {String}   description of the route : 'METHOD /path/...'
 * @param   {Function} generator   function associated to the route
 */
Router.prototype.addRoute = function(description, generator){
  assert(description.match(
    /(GET|HEAD|POST|PUT|DELETE|TRACE|OPTIONS|PATCH|CONNECT)\s(\/.*)/i),
    'a route description must look like \'METHOD /path/...\'');
  
  var index = description.indexOf(' ');
  
  var method = description.slice(0,index);
  var path = description.slice(index+1);
  // sanitize and split the path
  if(path.startsWith('/')){
    path = path.slice(1);
  }
  if(path.endsWith('/')){
    path = path.slice(0, -1);
  }
  var segments = path.split('/');
  if(segments.length === 1 && !segments[0]){
    segments = [];
  }
  // convert the route description into linked Step objects,
  // reading the path backwards
  var step = new Step({method: method, action: generator});
  for(let i = segments.length-1; i >= 0 ; i=i-1){
    let segment = segments[i];
    let previous;
    if(segment.startsWith(':')){
      let parameter = segment.slice(1);
      previous = new Step({parameter : parameter});
    }else{
      previous = new Step({segment : segment});
    }
    previous.append(step);
    step = previous;
  }
  // add the prent step to the router
  this.addStep(step);
};

/**
 * Add the step and its sub-steps to the router (internal use only)
 * @param   {Step}   step
 * @param   {Array}  optional, only to be used internaly (recursion)
 */
Router.prototype.addStep = function (step, processed){
  assert(step instanceof Step,
    'the first argument of the addStep function must be an instance of Step');
  if(!processed){
    processed = [];
  }
  if((step.segment || step.segment === '') &&
    processed.indexOf('segment') === -1){
      // segment processing 
      // retrieve router from the segment map
      let router = this.segments.get(step.segment);
      // if there are no corresponding segment, create and add it
      if(!router){
        router = new Router();
        this.segments.set(step.segment, router);
    }
    // update processed
    processed.push('segment');
    // recursive call : process the other parts of the step
    router.addStep(step, processed);
    
  } else if(step.parameter && processed.indexOf('parameter') === -1) {
    // parameter processing
    if(!this.parameter){
      // if there is no parameter yet, create it
      let router = new Router();
      this.parameter = {name : step.parameter, router : router};
    }
    if(this.parameter.name === step.parameter){
      // if there is already one with the same name, update processed
      processed.push('parameter');
      // recursive call : process the other parts of the step
      this.parameter.router.addStep(step, processed);
    } else {
      // there is already a parameter with another name : error
      throw new Error(
        'There is already a parameter at this step : ' + this.parameter);
    }
    
  } else if(step._substeps.length >0  && processed.indexOf('sub') === -1){
    // substeps processing
    step._substeps.forEach(function (subStep){
      this.addStep(subStep);
    }, this);
    // update processed
    processed.push('sub');
    // recursive call : process the other parts of the step
    this.addStep(step, processed);
    
  } else if(step.method && processed.indexOf('method') === -1){
    // method processing
    // retrieve router from the segment map
    let router = this.methods.get(step.method);
    // if there are no corresponding method, create and add it
    if(!router){
      router = new Router();
      this.methods.set(step.method.toUpperCase(), router);
    }
    // update processed
    processed.push('method');
    // recursive call : process the other parts of the step
    router.addStep(step, processed);
    
  } else if(step.action && processed.indexOf('action') === -1){
    // action processing
    if(this.action){
      // there is already an action !
      throw new Error('There is already a action at this step');
    } else {
      // set the action
      this.action = step.action;
      // update processed
      processed.push('action');
    }
  }
};

/**
 * Recursive method finding the generator of the router arborescence
 * and modifing the koa context if necessary (changing the status or
 * adding a parameter attribute)
 * @param   {Array}   array of segements (strings)
 * @param   {Object}  koa context
 * @returns {Generator} the generator corresponding to the segemnts, if exists
 */
Router.prototype.getRoute = function(segments, context){
  if(segments.length === 0 || (segments.length === 1 && !segments[0])){
    // no other segments to process
    if(this.action){
      // do the action associated with this router
      return this.action;
    } else {
      let nextRouter = this.methods.get(context.method);
      if(nextRouter){
        // delegate the processing to the router correponding to the method
        return nextRouter.getRoute(segments, context);
      } else {
        // return with bad method error
        context.status = (this.methods.size > 0 ? 405 : 404);
        return;
      }
    }
  } else {
    // process the first segment
    let segment = segments.shift();
    let nextRouter = this.segments.get(segment);
    if(nextRouter){
      // delegate the processing to the router correponding to the segment
      return nextRouter.getRoute(segments, context);
    } else if(this.parameter){
      // if there is no segment but a parameter
      if(!context.params){
        // if there are no parameters already stored in the context
        context.params = {};
      }
      // store the parameter
      context.params[this.parameter.name] = segment;
      // delegate the processing to the router correponding to the segment
      return this.parameter.router.getRoute(segments, context);
    }else{
      this.status = 404;
      return;
    }
  }
};


/**
 * Object configured by Steps or routes,
 * containing the middleware used by the application
 * A camino creates an aroborescence to build
 * its route network
 */
function Camino(){
  var self = this;
  
  // root of the router arborescence
  this.router= new Router();
  
  // middleware used by the application
  this.route = function *(next){
    // main router procesing : split the path and decode
    var segments = this.path.slice(1).split('/').map(decodeURI);
  
    var action = self.router.getRoute(segments, this);
    if(action){
      // if an action is found, process it in the given koa context
      return yield *action.call(this, next);
    } else{
      // else let koa do its job with middlewares
      return yield *next;
    }
  }; 
}

/**
 * Add a route to the camino
 * @param   {String}   description of the route : 'METHOD /path/...'
 * @param   {Function} generator   function associated to the route
 * @returns {Camino}   the updated Camino, enabling chaining 
 */
Camino.prototype.addRoute = function(description, generator){
  this.router.addRoute(description, generator);
  return this;
};

/**
 * Add the step and its sub-steps to the camino
 * @param   {Step}   step
 * @param   {Array}  optional, only to be used internaly (recursion)
 * @returns {Camino}   the updated Camino, enabling chaining 
 */
Camino.prototype.addStep = function (step){
  this.router.addStep(step, []);
  return this;
};

exports.Camino = Camino;
exports.Step = Step;
