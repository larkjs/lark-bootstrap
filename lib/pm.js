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
        state.isMaster = true;
        state.isWorker = false;
    }
    else if (role === 'worker') {
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
    app.config = config || {};
    pm_init();
    await run();
    return state;
};

function pm_init () {
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
    // By default the current app is regard as a worker process
    setProcessRole('worker');
    if (app.args.worker || !app.config.enable) {
        return;
    }

    // If reached here, this process must be the master process
    setProcessRole('master');

    // Run pm2 commands due to different args
    let pm2args = ['delete', 'stop', 'reload', 'restart', 'gracefulreload', 'kill'];
    for (pm2arg of pm2args) {
        if (app.args[pm2arg]) {
            let name = pm2arg;
            await pm2[name]();
            return;
        }
    }
    let list = await pm2.describe();

    // Run pm2 describe
    if (app.args.desc || app.args.describe) {
        console.log(list);
        return;
    }

    // If reached here, Run pm2 start
    // If app already exists under PM2, restart it
    if (list && list.length > 0) {
        /**
         * Since restart do not reload args,
         * Starting an existing app with some new args should run delete & start
         **/
        let node_args = list[0].pm2_env.node_args;
        let args      = list[0].pm2_env.args;
        if (!(node_args instanceof Object)) {
            node_args = JSON.parse(node_args);
        }
        if (arrayEqual(node_args, process.execArgv) &&
            arrayEqual(args, process.argv.slice(2).concat([app.args.prefix + app.args.worker]))) {
            await pm2.restart();
         }
         else {
            await pm2.delete();
            await pm2.start();
         }
    }
    else {
        await pm2.start();
    }
    return;
};

/**
 * Offers pm2 actions
 **/
const pm2 = {};

pm2.connect = async () => {
    return new Promise((resolve, reject) => {
        PM2.connect(err => {
            if (err) {
                return reject(err);
            }
            return resolve();
        });
    });
};

pm2.disconnect = async () => {
    return new Promise((resolve, reject) => {
        PM2.disconnect((err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        });
    });
};

pm2.start = async () => {
    let options = {
        name : app.appname,
        output : path.join(app.root, (app.config.outputLog || 'logs/log')),
        error : path.join(app.root, (app.config.errorLog || app.config.outputLog || 'logs/log')),
        mergeLogs : !!app.config.mergeLogs,
        nodeArgs : [],
        instances : app.config.instances || 'max',
    };

    if (app.config.watch) {
        options.watch = true;
        options.ignoreWatch = app.config.__file ? [app.config.__file] : [];
        [app.config.outputLog,app.config.errorLog].forEach(filePath => {
            //to dev @haohao
        });
    }

    await this.connect(); 
};

pm2.delete = async () => {

};

debug('load lib/pm.js ok!');
