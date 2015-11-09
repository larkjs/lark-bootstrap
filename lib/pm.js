/**
 * Process Management, Powered By PM2
 **/
import path     from 'path';
import LarkArg  from './arg';

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

function pm (config) {
    let processManage = new ProcessManager(config);
    return processManage.run();
};

class ProcessManager {
    constructor (config) {
        this.config = config || {};
        this.args = new LarkArg(this.config.larkArgPrefix);
        if (this.args.watch) {
            this.config.watch = true;
        }
        let filename = process.mainModule.filename;
        this.appname = this.config.name || filename;
        this.root    = path.dirname(filename);
        process.argv[1] = filename;
    }
    async run () {
        const result = {
            isMaster: false,
            isWorker: true,
        };
        if (this.args.worker  || !this.config.enable) {
            return result;
        }
        // If reached here, this process must be the master process
        result.isMaster = true;
        result.isWorker = false;
        // Run pm2 commands due to different args
        let pm2args = ['delete', 'stop', 'reload', 'restart', 'gracefulreload', 'kill'];
        for (pm2arg of pm2args) {
            if (this.args[pm2arg]) {
                await this[pm2arg]();
                return result;
            }
        }
        let list = await this.describe();
        // Run pm2 describe
        if (this.args.desc || this.args.describe) {
            console.log(list);
            return result;
        }
        // Run pm2 start
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
                arrayEqual(args, process.argv.slice(2).concat([this.args.prefix + this.args.worker]))) {
                await this.restart();
             }
             else {
                await this.delete();
                await this.start();
             }
        }
        else {
            await this.start();
        }
        return result;
    }
    async connect () {
        return new Promise((resolve, reject) => {
            PM2.connect(err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
    async disconnect () {
        return new Promise((resolve, reject) => {
            PM2.disconnect((err, result) => {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        });
    }
    async start () {
        let options = {
            name : this.appname,
            output : path.join(this.root, (this.config.outputLog || 'logs/log')),
            error : path.join(this.root, (this.config.errorLog || this.config.outputLog || 'logs/log')),
            mergeLogs : !!this.config.mergeLogs,
            nodeArgs : [],
            instances : this.config.instances || 'max',
        };

        if (this.config.watch) {
            options.watch = true;
            options.ignoreWatch = this.config.__file ? [this.config.__file] : [];
            [this.config.outputLog,this.config.errorLog].forEach(filePath => {
                //to dev @haohao
            });
        }

        await this.connect(); 
    }
    async delete () {

    }
}

export default pm;
