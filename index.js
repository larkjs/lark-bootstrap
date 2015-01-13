'use strict';
/**
 * Public module dependencies
 **/
var async = require('async');

/**
 * Private module dependencies
 **/
var configure       = require('./lib/configure');
var processManager  = require('./lib/processManager');

/**
 * Bootstrap
 **/
var bootstrap = module.exports = function(app, config){
    if(typeof app != 'object') throw new Error('App must be an object');

    config = config || {};
    configure(app, config);
    var pm = processManager(app, config.processManage);
    exports.isMaster = pm.isMaster;
    exports.isWorker = pm.isWorker;

    var queue = [];

    queue = before.concat(queue);


    queue = queue.concat(after);

    async.waterfall(queue, function(err){
        if(err) throw err;
    });


    middlewares.push(function*(next){
        yield next;
    });

    return function*(next){
        for(var index = 0; index < middlewares.length; index++){
            var middleware = middlewares[index];
            yield middleware.call(this, next);
        }
        yield next;
    }
}

//hooks
var before = [];
bootstrap.before = function(handler){
    if(typeof handler != 'function') throw new Error('Handler must be a function');
    before.unshift(handler);
};

var after  = [];
bootstrap.after  = function(handler){
    if(typeof handler != 'function') throw new Error('Handler must be a function');
    after.push(handler);
};

var middlewares = [];
bootstrap.middleware = function(handler){
    if(typeof handler != 'function') throw new Error('Handler must be a function');
    middlewares.push(handler);
}
