'use strict';

/**
 * Process Management, Powered By PM2
 **/

import path     from 'path';
import _debug   from 'debug';
import LarkArg  from './arg';
import utils    from './utils';

const debug = _debug('lark-bootstrap');

/**
 * Set PM2 HOME
 **/
process.env.PM2_SILENT  = true;
process.env.PM2_HOME    = process.env.PM2_HOME || path.join(__dirname, '..');
process.env.PM2_HOME    = path.join(process.env.PM2_HOME, '.pm2');
/**
 * importing PM2 would use process.env.PM2_HOME
 * So import it here
 **/
//import PM2      from 'pm2';  // babel would move this line to the head of this script. use require to avoid it;
const PM2 = require('pm2');

/**
 * Used to record args/ctx/status of this app
 **/
const app = {};

/**
 * Result to return, by default returns the info that
 * the current process is a worker process
 **/
const state = {
    isMaster: false,
    isWorker: true,
};

function setProcessRole(role) {
    if (!role || 'string' !== typeof role) return;
    role = role.toLowerCase();
    if (role === 'master') {
        debug('PM: process is set master');
        state.isMaster = true;
        state.isWorker = false;
    }
    else if (role === 'worker') {
        debug('PM: process is set worker');
        state.isMaster = false;
        state.isWorker = true;
    }
    return;
}

/**
 * @export as default
 * Manage the current app
 **/
export default async (config) => {
    debug('PM: process management start');
    app.config = config || {};
    pm_init();
    await run();
    await clean();
    return state;
};

function pm_init () {
    debug('PM: initializing');
    app.args   = new LarkArg(app.config.larkArgPrefix);
    if (app.args.watch) {
        app.config.watch = true;
    }
    let filename  = process.mainModule.filename;
    app.name      = app.config.name || filename;
    app.root      = path.dirname(filename);
    process.argv[1] = filename;
};

async function run () {
    debug('PM: runing');
    // By default the current app is regard as a worker process
    setProcessRole('worker');
    if (app.args.worker || !app.config.enable) {
        return;
    }

    // If reached here, this process must be the master process
    setProcessRole('master');

    // Run pm2 commands due to different args
    debug('PM: checking if none-start command');
    let pm2args = ['delete', 'stop', 'reload', 'restart', 'gracefulreload', 'kill'];
    for (let pm2arg of pm2args) {
        if (app.args[pm2arg]) {
            let name = pm2arg;
            debug('PM: checking result : ' + name);
            await pm2[name]();
            return;
        }
    }
    debug('PM: checking result : start or describe');

    // Run pm2 describe
    if (app.args.desc || app.args.describe) {
        debug('PM: describing service');
        let list = await pm2.describe();
        console.log(list);
        return;
    }

    // Run pm2 start
    debug("PM: starting service");
    await pm2.start();

    return;
};

/**
 * If no process is under PM2's management,
 * kill PM2 Daemon
 **/
async function clean () {
    debug('PM: clean');
    let list = await pm2.list();
    if (!list || !Array.isArray(list) || list.length <= 0) {
        debug("PM: no process is under PM2's management");
        await pm2.kill();
    }
    else {
        debug("PM: No need to kill PM2");
    }
};

/**
 * Offers pm2 actions
 **/
const pm2 = {};

pm2.connect = async () => {
    return new Promise((resolve, reject) => {
        debug('PM: pm2.connect');
        PM2.connect(err => {
            if (err) {
                return reject(err);
            }
            debug('PM: pm2.connect ok');
            return resolve();
        });
    });
};

pm2.disconnect = async () => {
    return new Promise((resolve, reject) => {
        debug('PM: pm2.disconnect');
        PM2.disconnect((err, result) => {
            if (err) {
                return reject(err);
            }
            debug('PM: pm2.disconnect ok');
            return resolve(result);
        });
    });
};

const cmdWithMessage  = ['start', 'restart','stop','delete','reload','gracefulReload'];
pm2.command = async (cmd, options) => {
    debug('PM: pm2.command(' + cmd + ')');
    let err = null;
    let result = null;
    try {
        await pm2.connect();
        result = await pm2cmd(cmd, options);
    }
    catch (e) {
        err = e;
        console.log("Error : " + (e.message || e.msg || e));
    }
    
    // finish command by showing finish status
    if (cmdWithMessage.indexOf(cmd) >= 0) {
        debug('PM: pm2.command(' + cmd + ') displaying result status');
        cmd = cmd.toLowerCase();
        cmd[0] = cmd[0].toUpperCase();
        console.log('[Lark-PM2] ' + cmd + (!err ?' OK' : ' Fail!'));
    }
    else {
        debug('PM: pm2.command(' + cmd + ') displaying nothing');
    }

    // if not kill daemon, should disconnect
    if (cmd !== 'killDaemon') {
        try {
            await pm2.disconnect();
        }
        catch (e) {
            err = e;
            console.log("Error : " + (e.message || e.msg || e));
        }
    }
    else {
        process.exit(0);
    }

    return result;
};


/**
 * Call PM2 apis
 **/
const cmdWithFileName = ['start', 'restart','stop','delete','reload','gracefulReload','describe'];
// only command start need options
async function pm2cmd (cmd, options) {
    if (!(PM2[cmd] instanceof Function)) {
        throw new Error('PM2 does not have method ' + cmd);
    }
    debug('PM: pm2cmd ' + cmd);

    let result = await new Promise((resolve, reject) => {
        let cb = (err, data) => {
            if (err) return reject(err);
            return resolve(data);
        };
        if(cmdWithFileName.indexOf(cmd) >= 0) {
            debug('PM: executing PM2 command ' + cmd + ' with app name ' + app.name);
            if (cmd === 'start') {
                PM2[cmd](app.name, options, cb);
            }
            else {
                PM2[cmd](app.name, cb);
            }
        }
        else {
            debug('PM: executing PM2 command ' + cmd);
            PM2[cmd](cb);
        }
    });

    return result;
};

pm2.start = async () => {
    debug("PM: pm2.start (Compatibility Mode)");

    debug("PM: pm2.start, checking if service is runing");
    let list = await pm2.describe();
    if (list && list.length > 0) {
        debug('PM: checking result : running');
        /**
         * Since restart do not reload args,
         * Starting an existing app with some new args should run delete & start
         **/
        let node_args = list[0].pm2_env.node_args;
        let args      = list[0].pm2_env.args;
        if (!(node_args instanceof Object)) {
            node_args = JSON.parse(node_args);
        }
        if (utils.arrayEqual(node_args, process.execArgv) &&
            utils.arrayEqual(args, process.argv.slice(2).concat([app.args.toCmdArg('worker')]))) {
            debug('PM: pm2.start pm2.restart to restart service');
            await pm2.restart();
         }
         else {
            debug('PM: pm2.start pm2.delete & pm2.start to restart service');
            await pm2.delete();
            await pm2._start();
         }
    }
    else {
        debug('PM: checking result : not running');
        await pm2._start();
    }
    return;
};

pm2._start = async () => {
    debug("PM: pm2.start (None Compatibility Mode)");
    let options = {
        name : app.name,
        output : path.join(app.root, (app.config.outputLog || 'logs/log')),
        error : path.join(app.root, (app.config.errorLog || app.config.outputLog || 'logs/log')),
        exec_mode: app.config.exec_mode || '',
        mergeLogs : !!app.config.mergeLogs,
        nodeArgs : [],
        instances : app.config.instances || 'max',
        env : process.env,
    };

    if (app.config.watch) {
        debug('PM: pm2.start, watch mode enabled');
        options.watch = true;
        options.ignoreWatch = app.config.__file ? [app.config.__file] : [];
        [app.config.outputLog,app.config.errorLog].forEach(filePath => {
            //to dev @haohao
        });
    }

    options.scriptArgs = process.argv.slice(2).concat([app.args.toCmdArg('worker')]);

    await pm2.command('start', options);
};

pm2.des = pm2.describe = async () => {
    return await pm2.command('describe');
};

pm2.list = pm2.list = async () => {
    return await pm2.command('list');
};

pm2.stop = async () => {
    return await pm2.command('stop');
};

pm2.restart = async () => {
    return await pm2.command('restart');
};

pm2.gracefulreload = async () => {
    return await pm2.command('gracefulReload');
};

pm2.delete = async () => {
    return await pm2.command('delete');
};

pm2.kill = async () => {
    return await pm2.command('killDaemon');
};

debug('PM: script loaded');
