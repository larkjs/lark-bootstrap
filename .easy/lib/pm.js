'use strict'

/**
 * Process Management, Powered By PM2
 **/

;
Object.defineProperty(exports, "__esModule", {
    value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _debug2 = require('debug');

var _debug3 = _interopRequireDefault(_debug2);

var _arg = require('./arg');

var _arg2 = _interopRequireDefault(_arg);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } step("next"); }); }; }

const debug = (0, _debug3.default)('lark-bootstrap');

/**
 * Set PM2 HOME
 **/
process.env.PM2_SILENT = true;
//process.env.PM2_HOME    = process.env.PM2_HOME || path.join(__dirname, '..');
process.env.PM2_HOME = process.env.PM2_HOME || _path2.default.dirname(process.mainModule.filename);
if (!process.env.PM2_HOME.match(/\.pm2\/?$/)) {
    process.env.PM2_HOME = _path2.default.join(process.env.PM2_HOME, '.pm2');
}
debug('PM: env PM2_HOME is set to ' + process.env.PM2_HOME);
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
    isWorker: true
};

function setProcessRole(role) {
    if (!role || 'string' !== typeof role) return;
    role = role.toLowerCase();
    if (role === 'master') {
        debug('PM: process is set master');
        state.isMaster = true;
        state.isWorker = false;
    } else if (role === 'worker') {
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

exports.default = (function () {
    var ref = _asyncToGenerator(function* (config) {
        debug('PM: process management start');
        app.config = config || {};
        pm_init();
        yield run();
        yield clean();
        return state;
    });

    return function (_x) {
        return ref.apply(this, arguments);
    };
})();

function pm_init() {
    debug('PM: initializing');
    app.args = new _arg2.default(app.config.larkArgPrefix);
    if (app.args.watch) {
        app.config.watch = true;
    }
    let filename = process.mainModule.filename;
    app.name = app.config.name || filename;
    app.root = _path2.default.dirname(filename);
    process.argv[1] = filename;
};

let run = (function () {
    var ref = _asyncToGenerator(function* () {
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
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = pm2args[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                let pm2arg = _step.value;

                if (app.args[pm2arg]) {
                    let name = pm2arg;
                    debug('PM: checking result : ' + name);
                    yield pm2[name]();
                    return;
                }
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        debug('PM: checking result : start or describe');

        // Run pm2 describe
        if (app.args.desc || app.args.describe) {
            debug('PM: describing service');
            let list = yield pm2.describe();
            console.log(list);
            return;
        }

        // Run pm2 start
        debug("PM: starting service");
        yield pm2.start();

        return;
    });

    return function run() {
        return ref.apply(this, arguments);
    };
})();

;

/**
 * If no process is under PM2's management,
 * kill PM2 Daemon
 **/

let clean = (function () {
    var ref = _asyncToGenerator(function* () {
        debug('PM: clean');
        let list = yield pm2.list();
        if (!list || !Array.isArray(list) || list.length <= 0) {
            debug("PM: no process is under PM2's management");
            yield pm2.kill();
        } else {
            debug("PM: No need to kill PM2");
        }
    });

    return function clean() {
        return ref.apply(this, arguments);
    };
})();

;

/**
 * Offers pm2 actions
 **/
const pm2 = {};

pm2.connect = _asyncToGenerator(function* () {
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
});

pm2.disconnect = _asyncToGenerator(function* () {
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
});

const cmdWithMessage = ['start', 'restart', 'stop', 'delete', 'reload', 'gracefulReload'];
pm2.command = (function () {
    var ref = _asyncToGenerator(function* (cmd, options) {
        debug('PM: pm2.command(' + cmd + ')');
        let err = null;
        let result = null;
        try {
            yield pm2.connect();
            result = yield pm2cmd(cmd, options);
        } catch (e) {
            err = e;
            console.log("Error : " + (e.message || e.msg || e));
        }

        // finish command by showing finish status
        if (cmdWithMessage.indexOf(cmd) >= 0) {
            debug('PM: pm2.command(' + cmd + ') displaying result status');
            let cmd_to_display = cmd.toLowerCase();
            cmd_to_display = cmd_to_display[0].toUpperCase() + cmd_to_display.slice(1);
            console.log('[Lark-PM2] ' + cmd_to_display + (!err ? ' OK' : ' Fail!'));
        } else {
            debug('PM: pm2.command(' + cmd + ') displaying nothing');
        }

        // if not kill daemon, should disconnect
        if (cmd !== 'killDaemon') {
            try {
                yield pm2.disconnect();
            } catch (e) {
                err = e;
                console.log("Error : " + (e.message || e.msg || e));
            }
        } else {
            process.exit(0);
        }

        return result;
    });

    return function (_x2, _x3) {
        return ref.apply(this, arguments);
    };
})();

/**
 * Call PM2 apis
 **/
const cmdWithFileName = ['start', 'restart', 'stop', 'delete', 'reload', 'gracefulReload', 'describe'];
// only command start need options

let pm2cmd = (function () {
    var ref = _asyncToGenerator(function* (cmd, options) {
        if (!(PM2[cmd] instanceof Function)) {
            throw new Error('PM2 does not have method ' + cmd);
        }
        debug('PM: pm2cmd ' + cmd);

        let result = yield new Promise((resolve, reject) => {
            let cb = (err, data) => {
                if (err) return reject(err);
                return resolve(data);
            };
            if (cmdWithFileName.indexOf(cmd) >= 0) {
                debug('PM: executing PM2 command ' + cmd + ' with app name ' + app.name);
                if (cmd === 'start') {
                    PM2[cmd](app.name, options, cb);
                } else {
                    PM2[cmd](app.name, cb);
                }
            } else {
                debug('PM: executing PM2 command ' + cmd);
                PM2[cmd](cb);
            }
        });

        return result;
    });

    return function pm2cmd(_x4, _x5) {
        return ref.apply(this, arguments);
    };
})();

;

pm2.start = _asyncToGenerator(function* () {
    debug("PM: pm2.start (Compatibility Mode)");

    debug("PM: pm2.start, checking if service is runing");
    let list = yield pm2.describe();
    if (list && list.length > 0) {
        debug('PM: checking result : running');
        /**
         * Since restart do not reload args,
         * Starting an existing app with some new args should run delete & start
         **/
        let node_args = list[0].pm2_env.node_args;
        let args = list[0].pm2_env.args;
        if (!(node_args instanceof Object)) {
            node_args = JSON.parse(node_args);
        }
        //console.log(node_args, process.execArgv);
        if (_utils2.default.arrayEqual(node_args, process.execArgv) && _utils2.default.arrayEqual(args, process.argv.slice(2).concat([app.args.toCmdArg('worker')]))) {
            debug('PM: pm2.start pm2.restart to restart service');
            yield pm2.restart();
        } else {
            debug('PM: pm2.start pm2.delete & pm2.start to restart service');
            yield pm2.delete();
            yield pm2._start();
        }
    } else {
        debug('PM: checking result : not running');
        yield pm2._start();
    }
    return;
});

pm2._start = _asyncToGenerator(function* () {
    debug("PM: pm2.start (None Compatibility Mode)");
    let options = {
        name: app.name,
        output: _path2.default.join(app.root, app.config.outputLog || 'logs/log'),
        error: _path2.default.join(app.root, app.config.errorLog || app.config.outputLog || 'logs/log'),
        exec_mode: app.config.exec_mode || '',
        mergeLogs: !!app.config.mergeLogs,
        nodeArgs: process.execArgv,
        instances: app.config.instances || 'max',
        env: process.env
    };

    if (app.config.watch) {
        debug('PM: pm2.start, watch mode enabled');
        options.watch = true;
        options.ignoreWatch = app.config.__file ? [app.config.__file] : [];
        [app.config.outputLog, app.config.errorLog].forEach(filePath => {
            //to dev @haohao
        });
    }

    options.scriptArgs = process.argv.slice(2).concat([app.args.toCmdArg('worker')]);

    yield pm2.command('start', options);
});

pm2.des = pm2.describe = _asyncToGenerator(function* () {
    return yield pm2.command('describe');
});

pm2.list = pm2.list = _asyncToGenerator(function* () {
    return yield pm2.command('list');
});

pm2.stop = _asyncToGenerator(function* () {
    return yield pm2.command('stop');
});

pm2.restart = _asyncToGenerator(function* () {
    return yield pm2.command('restart');
});

pm2.gracefulreload = _asyncToGenerator(function* () {
    return yield pm2.command('gracefulReload');
});

pm2.delete = _asyncToGenerator(function* () {
    return yield pm2.command('delete');
});

pm2.kill = _asyncToGenerator(function* () {
    return yield pm2.command('killDaemon');
});

debug('PM: script loaded');