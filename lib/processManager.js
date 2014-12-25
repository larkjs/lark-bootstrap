'use strict';

var utils = require('./utils');
var path = require('path');

utils.makeFsCreateDir();

process.env.PM2_SILENT = true;
var pm2  = require('pm2');

var filename = null;
var root = null;

module.exports = function(app, config){
    if(!config.enable) return;
    filename = app.root.filename;
    root = path.dirname(filename);

    larkArgInit(config.larkArgPrefix);
    var larkArgv = [];
    var argv     = [];
    process.argv.forEach(function(arg){
        if(arg.match(new RegExp("^"+larkArg()+".*$"))){
            larkArgv.push(arg);
        }
        else{
            argv.push(arg);
        }
    });
    process.argv = argv;
    process.argv[1] = filename;

    /**
     * @note  Arg '[lark_prefix]worker' is passed by master process
     *        to mark this process as a worker process
     *        Worker process do not handle process management
     *        So just do nothing and return
     **/
    if(larkArgv.indexOf(larkArg('worker'))>=0){
        //DO NOTHING
        return;
    }

    utils.mkdirSyncP(path.join(process.env.HOME, '.pm2/pids'));

    //utils.mkdirSyncP(path.join(process.env.HOME,'.pm2'));

    /**
     * @note  Since PM will start new processes for app
     *        and exit current process which is asynchronous
     *        The app in current process should be disabled
     *        to avoid be executed before process exit
     **/
    disable(app); 

    if(larkArgv.indexOf(larkArg('watch'))>=0){
        config.watch = true;
    }

    /**
     * @desc  Run pm2 command by different args
     **/
    if(larkArgv.indexOf(larkArg('delete'))>=0){
        pm2delete();
    }
    else if(larkArgv.indexOf(larkArg('stop'))>=0){
        pm2stop();
    }
    else if(larkArgv.indexOf(larkArg('reload'))>=0){
        pm2reload();
    }
    else if(larkArgv.indexOf(larkArg('restart'))>=0){
        pm2restart(config);
    }
    else if(larkArgv.indexOf(larkArg('gracefulreload'))>=0){
        pm2gracefulreload();
    }
    else if(larkArgv.indexOf(larkArg('kill'))>=0){
        pm2kill();
    }
    else if(larkArgv.indexOf(larkArg('desc'))>=0){
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
                pm2restart(config);
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
function disable(app){
    app.listen = emptyFunc;
};

function emptyFunc(){
    return this;
};

var larkArgPrefix = null;
function larkArgInit(prefix){
    larkArgPrefix = prefix || '';
};

function larkArg(arg){
    if(larkArgPrefix === null) throw new Error("lark arg prefix not initialized");
    arg = arg || '';
    return larkArgPrefix + arg;
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
        if(err) throw err;
        var options = {
            name : filename,
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

        options.scriptArgs = process.argv.slice(2).concat([larkArg('worker')]);
        
        utils.mkdirSyncP(path.dirname(options.output));
        utils.mkdirSyncP(path.dirname(options.error));

        pm2.start(filename, options, function(err, proc){
            if(err) throw err;
            pm2.disconnect(function(){
                console.log("[Lark-PM2] Start " + filename + ' OK');
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

/**
 * @note  pm2.restart could reload js files, but it can not reload args from terminal
 *        So use delete and start to replace restart
 **/
function pm2restart(config, callback){
    //pm2cmd('restart', callback);
    pm2delete(function(){
        pm2start(config, callback);
    });
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
        if(err) throw err;

        if(typeof pm2[cmd] != 'function') throw new Error('PM2 has no method ' + cmd);
        
        function disconnect(err, result){
            if(err) throw err;
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
            pm2[cmd](filename,disconnect);
        }
        else{
            pm2[cmd](disconnect);
        }
    });
};
