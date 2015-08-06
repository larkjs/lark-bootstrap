'use strict';
/**
 * Public module dependencies
 **/
var async = require('async');

/**
 * Private module dependencies
 **/
var arg             = require('./lib/arg');
var configure       = require('./lib/configure');
var processManager  = require('./lib/processManager');

/**
 * Bootstrap
 **/
var bootstrap = module.exports = function(app, config){
    if(typeof app != 'object') throw new Error('App must be an object');

    config = config || {};

    var res = initProcess(app, config);

    var ret = initOnRequest(app, config);

    for(var i in res){
        ret[i] = res[i];
    }
    return ret;
}

function initProcess(app, config){
    var res = {};
    arg.init(config.arg);
    configure(app, config);
    var pm = processManager(app, config.processManage, bootstrap);
    res.isMaster = pm.isMaster;
    res.isWorker = pm.isWorker;

    var queue = [];

    queue = before.concat(queue);

    queue = queue.concat(after);

    async.waterfall(queue, function(err){
        if(err) throw err;
    });

    return res;
}

function initOnRequest(app, config){
    var ret = {};
    middlewares.push(function*(next){
        yield next;
    });

    ret.middleware = function*(next){
        for(var index = 0; index < middlewares.length; index++){
            var middleware = middlewares[index];
            yield middleware.call(this, next);
        }
        yield next;
    }

    return ret;
}

//hooks
var before = [];
bootstrap.before = function(handler){
    if(typeof handler != 'function') throw new Error('Handler must be a function');
    before.unshift(handler);
    return bootstrap;
};

var after  = [];
bootstrap.after  = function(handler){
    if(typeof handler != 'function') throw new Error('Handler must be a function');
    after.push(handler);
    return bootstrap;
};

var middlewares = [];
bootstrap.middleware = function(handler){
    if(typeof handler != 'function') throw new Error('Handler must be a function');
    middlewares.push(handler);
    return bootstrap;
}
