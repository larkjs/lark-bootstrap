'use strict';

var arg   = require('./arg');
var utils = require('./utils');
var path  = require('path');
var cp    = require('child_process');

process.env.PM2_SILENT = true;
process.env.PM2_HOME   = process.env.PM2_HOME || path.join(__dirname, '..');
process.env.PM2_HOME   = path.join(process.env.PM2_HOME, '.pm2');
pm2  = require('pm2');

module.exports = processManager;

var filename = null;
var appname = null;
var root = null;

var pm2;

var pm = {
    error : null,
    isMaster : false,
    isWorker : true,
};

function processManager (app, config, bootstrap){
    /**
     * @note  Arg '[lark_prefix]worker' is passed by master process
     *        to mark this process as a worker process
     *        Worker process do not handle process management
     *        So just do nothing and return
     **/
    if(arg('worker')){
        return pm;
    }
    if(!arg('watch') && !config.enable) {
        return pm;
    }

    bootstrap = bootstrap || {};
    filename = app.root.filename;
    appname = config.name || filename;
    root = path.dirname(filename);

    process.argv[1] = filename;

    pm.isMaster = true;
    pm.isWorker = false;

    /**
     * @note  Since PM will start new processes for app
     *        and exit current process which is asynchronous
     *        The app in current process should be disabled
     *        to avoid be executed before process exit
     **/
    disableListen(bootstrap.disableListen); 

    prepareProcess();

    executePm2(config);

    return pm;
}

function prepareProcess () {
    utils.mkdirSyncP(process.env.PM2_HOME);
    utils.mkdirSyncP(path.join(process.env.PM2_HOME, 'pids'));
    if(path.basename(process.argv[0]) != 'node'){
        throw new Error("Node Bin name must be exactly <node> for PM2");
    }

    process.env.PATH = path.dirname(process.argv[0]) + ':' + process.env.PATH;
}

processManager.cmd = function (command, callback) {
    prepareProcess();
    callback = callback || function () {
        process.exit(0);
    };
    pm2cmd(command, function () {
        callback.apply(callback, arguments);
    });
    return processManager;
};

function executePm2(config){
    if(arg('watch')){
        config.watch = true;
    }

    /**
     * @desc  Run pm2 command by different args
     **/
    if(arg('delete')){
        pm2delete();
    }
    else if(arg('stop')){
        pm2stop();
    }
    else if(arg('reload')){
        pm2reload();
    }
    else if(arg('restart')){
        pm2restart(config);
    }
    else if(arg('gracefulreload')){
        pm2gracefulreload();
    }
    else if(arg('kill')){
        pm2kill();
    }
    else if(arg('desc')){
        pm2describe(function(err, list){
            if (!err) console.log(list);
            process.exit(0);
        });
    }
    else{
        /**
         * @desc  Start the app
         **/
        pm2describe(function(err, list){
            if (err) return process.exit(0);
            if(list && list.length > 0){
                /**
                 * Since restart do not reload args,
                 * Starting an existing app with some new args should run delete & start
                 **/
                var node_args = list[0].pm2_env.node_args;
                var args      = list[0].pm2_env.args;
                if (typeof node_args != 'object') {
                    node_args = JSON.parse(node_args);
                }
                if (typeof args != 'object') {
                    args = JSON.parse(args);
                }
                if (arrayEqual(node_args, process.execArgv) &&
                    arrayEqual(args, process.argv.slice(2).concat([arg.toCmdArg('worker')]))) {
                    pm2restart(config);
                }
                else {
                    pm2delete(function(err){
                        if (err) return process.exit(0);
                        pm2start(config);
                    });
                }
            }
            else{
                pm2start(config);
            }
        }, true);
    }
}

/**
 * @desc    disable app listen
 **/
function disableListen(userDisableHandler){
    if (userDisableHandler instanceof Function) {
        return userDisableHandler();
    }
    var NetServer = require('net').Server;
    NetServer.prototype.listen = function () {
        return this;
    };
};

/**
 * @desc    Start new processes for the app
 *          By default instance number is the CPU counts
 *          Will pass arg '[lark_prefix]worker' to mark the new
 *          processes worker process.
 **/
function pm2start(config, callback, NO_CLEAN){
    if(!callback && typeof config == 'function'){
        callback = config;
        config = null;
    }
    if(!config){
        config = {};
    }
    pm2.connect(function(err){
        if(err) return handlePM2Result(err, null, 'start', NO_CLEAN, callback);
        var options = {
            name : appname,
            output : path.join(root, (config.outputLog || 'logs/log')),
            error  : path.join(root, (config.errorLog  || config.outputLog || 'logs/log')),
            mergeLogs : config.mergeLogs ? true : false,
            nodeArgs : [],
            instances : config.instances || 'max',
        };

        if(process.execArgv.indexOf('--harmony') >= 0){
            options.nodeArgs.push('--harmony');
        }

        if(config.watch){
            options.watch = true;
            options.ignoreWatch = [config.__file,config.outputLog,config.errorLog];
            Array.isArray(config.reservedIgnoreWatch) && (options.ignoreWatch = options.ignoreWatch.concat(config.reservedIgnoreWatch));
            Array.isArray(config.ignoreWatch) && (config.ignoreWatch.forEach(function(ignorePath){
                options.ignoreWatch.push(ignorePath);
            }));
        }

        options.scriptArgs = process.argv.slice(2).concat([arg.toCmdArg('worker')]);
        
        utils.mkdirSyncP(path.dirname(options.output));
        utils.mkdirSyncP(path.dirname(options.error));

        pm2.start(filename, options, function(err, proc){
            return handlePM2Result(err, proc, 'start', NO_CLEAN, callback);
        });
    });
};

/**
 * @desc    Delete current app processes
 *          If no app exists in PM2
 *          Kill the PM2 daemon
 **/
function pm2clean(callback) {
    pm2cmd('list', function(err, list){
        if(!err && list && list.length == 0){
            pm2kill(callback);
        }
        else if(typeof callback == 'function'){
            callback(err);
        }
        else{
            process.exit(0);
        }
    }, true);
}

function pm2delete(callback){
    pm2cmd('delete', callback);
};

function pm2stop(callback){
    pm2cmd('stop',callback);
};

function pm2reload(callback){
    pm2cmd('reload', callback);
};

function pm2restart(config, callback){
    pm2cmd('restart', callback);
};

function pm2gracefulreload(callback){
    pm2cmd('gracefulReload', callback);
};

function pm2kill(callback){
    pm2cmd('killDaemon', callback, true);
};

function pm2describe(callback, NO_CLEAN){
    pm2cmd('describe', callback, NO_CLEAN);
}

/**
 * @desc    Run PM2 commands supported
 *          If callback is set ,will execute callback(err, result)
 *          in the end
 **/
var cmdWithFileName = ['start', 'restart','stop','delete','reload','gracefulReload','describe'];
var cmdWithMessage  = ['start', 'restart','stop','delete','reload','gracefulReload'];
function pm2cmd(cmd, callback, NO_CLEAN){
    pm2.connect(function(err){
        if(err) return handlePM2Result(err, null, cmd, NO_CLEAN, callback);

        if(typeof pm2[cmd] != 'function') return handlePM2Result(new Error('PM2 has no method ' + cmd), null, cmd, NO_CLEAN, callback);
        
        function disconnect(err, result){
            return handlePM2Result(err, result, cmd, NO_CLEAN, callback);
        }

        if(cmdWithFileName.indexOf(cmd) >= 0){
            pm2[cmd](appname,disconnect);
        }
        else{
            pm2[cmd](disconnect);
        }
    });
};

function handlePM2Result (err, result, cmd, NO_CLEAN, callback) {
    if (err) {
        console.log("Error : " + (err.message || err.msg || err));
    }
    function disconnect(derr) {
        if (derr) {
            console.log("Disconnect Error : " + (derr.message || derr.msg || derr));
        }
        var handleEnd = function () {
            if(cmd && cmdWithMessage.indexOf(cmd) >= 0){
                cmd = cmd.toLowerCase();
                cmd[0] = cmd[0].toUpperCase();
                console.log('[Lark-PM2] ' + cmd + (!err ?' OK' : ' Fail!'));
            }
            if (callback instanceof Function) return callback(err, result);
            if (err) {
                console.log("Process exit...");
                return process.exit(1);
            }
            else {
                return process.exit(0);
            }
        };
        if (NO_CLEAN) {
            return handleEnd(err);
        }
        else {
            pm2clean(handleEnd);
        }
    };

    if (cmd === 'killDaemon') {
        return disconnect(null);
    }
    else {
        return pm2.disconnect(disconnect);
    }
};

function arrayEqual (arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length != arr2.length) {
        return false;
    }
    for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] != arr2[i]) {
            return false;
        }
    }
    return true;
};
