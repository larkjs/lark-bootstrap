'use strict';

var arg   = require('./arg');
var utils = require('./utils');
var path  = require('path');
var cp    = require('child_process');

module.exports = processManager;

utils.makeFsCreateDir();

process.env.PM2_SILENT = true;
var pm2  = require('pm2');

var filename = null;
var appname = null;
var root = null;

var pm = {
    error : null,
    isMaster : false,
    isWorker : true,
};

function processManager (app, config){
    if(!config.enable) return pm;
    filename = app.root.filename;
    appname = config.name || filename;
    root = path.dirname(filename);

    process.argv[1] = filename;

    /**
     * @note  Arg '[lark_prefix]worker' is passed by master process
     *        to mark this process as a worker process
     *        Worker process do not handle process management
     *        So just do nothing and return
     **/
    if(arg('worker')){
        return pm;
    }

    pm.isMaster = true;
    pm.isWorker = false;

    utils.mkdirSyncP(path.join(process.env.HOME, '.pm2/pids'));

    /**
     * @note  Since PM will start new processes for app
     *        and exit current process which is asynchronous
     *        The app in current process should be disabled
     *        to avoid be executed before process exit
     **/
    disableHttpServer(); 

    if(path.basename(process.argv[0]) != 'node'){
        throw new Error("Node Bin name must be exactly <node> for PM2");
    }

    process.env.PATH = path.dirname(process.argv[0]) + ':' + process.env.PATH;

    executePm2(config);

    return pm;
}

processManager.cmd = function (command, silent, callback) {
    if (!callback) {
        callback = silent;
        silent = false;
    }
    callback = callback || function () {};
    if (silent) {
        var old_silent = process.env.PM2_SILENT;
        process.env.PM2_SILENT = silent;
        pm2cmd(command, function () {
            process.env.PM2_SILENT = old_silent;
            callback.apply(callback, arguments);
        });
    }
    else {
        var pm2path = path.join(__dirname, '../node_modules/pm2/bin/pm2');
        cp.exec(pm2path + ' ' + command, callback);
    }
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
        pm2describe(function(list){
            console.log(list);
            process.exit(0);
        });
    }
    else{
        /**
         * @desc  Start the app
         **/
        pm2describe(function(list){
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
                    pm2delete(function(){
                        pm2start(config);
                    });
                }
            }
            else{
                pm2start(config);
            }
        });
    }
}

/**
 * @desc    disable app listen
 **/
function disableHttpServer(){
    var HttpServer = require('http').Server;
    HttpServer.prototype.listen = emptyFunc;
};

function emptyFunc(){
    return this;
};

/**
 * @desc    Start new processes for the app
 *          By default instance number is the CPU counts
 *          Will pass arg '[lark_prefix]worker' to mark the new
 *          processes worker process.
 **/
function pm2start(config, callback){
    if(!callback && typeof config == 'function'){
        callback = config;
        config = null;
    }
    if(!config){
        config = {};
    }
    pm2.connect(function(err){
        if(err) return handleError(err);
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
            if(err) return handleError(err);
            pm2.disconnect(function(){
                console.log("[Lark-PM2] Start " + appname + ' OK');
                if(callback && typeof callback == 'function') return callback(proc);
                process.exit(0);
            });
        });
    });
};

/**
 * @desc    Delete current app processes
 *          If no app exists in PM2
 *          Kill the PM2 daemon
 **/
function pm2delete(callback){
    pm2cmd('delete', function(){
        pm2cmd('list', function(list){
            if(list && list.length == 0){
                pm2kill(callback);
            }
            else if(typeof callback == 'function'){
                callback();
            }
            else{
                process.exit(0);
            }
        });
    });
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
    pm2cmd('killDaemon', callback);
};

function pm2describe(callback){
    pm2cmd('describe', callback);
}

/**
 * @desc    Run PM2 commands supported
 *          If callback is set ,will execute callback(err, result)
 *          in the end
 **/
function pm2cmd(cmd, callback){
    var cmdWithFileName = ['restart','stop','delete','reload','gracefulReload','describe'];
    var cmdWithMessage  = ['restart','stop','delete','reload','gracefulReload'];

    pm2.connect(function(err){
        if(err) return handleError(err);

        if(typeof pm2[cmd] != 'function') return handleError(new Error('PM2 has no method ' + cmd));
        
        function disconnect(err, result){
            if(err) return handleError(err);
            pm2.disconnect(function(){
                if(cmdWithMessage.indexOf(cmd) >= 0){
                    cmd = cmd.toLowerCase();
                    cmd[0] = cmd[0].toUpperCase();
                    console.log('[Lark-PM2] ' + cmd + ' OK');
                }
                if(callback) return callback(result);
                process.exit(0);
            });
        }

        if(cmdWithFileName.indexOf(cmd) >= 0){
            pm2[cmd](appname,disconnect);
        }
        else{
            pm2[cmd](disconnect);
        }
    });
};

function handleError (err) {
    console.log("Error : " + (err.message || err.msg || err));
    pm2.disconnect(function () {
        console.log("Process exit...");
        process.exit(1);
    });
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
