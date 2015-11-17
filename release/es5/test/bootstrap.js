/**
 * lark - lark-bootstrap test cases
 **/
'use strict';

var _debug2 = require('debug');

var _debug3 = _interopRequireDefault(_debug2);

var _should = require('should');

var _should2 = _interopRequireDefault(_should);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _default = require('../config/default.json');

var _default2 = _interopRequireDefault(_default);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug3.default)('lark-bootstrap');

_child_process2.default._exec = _child_process2.default.exec;
_child_process2.default._execSync = _child_process2.default.execSync;

_child_process2.default.exec = function (command, options, callback) {
    command = 'DEBUG=NONE ' + command;
    return _child_process2.default._exec(command, options, callback);
};

_child_process2.default.execSync = function (command, options) {
    command = 'DEBUG=NONE ' + command;
    return _child_process2.default._execSync(command, options);
};

debug('Test: starting test lark-bootstrap');

process.env.PM2_HOME = _path2.default.dirname(__dirname);
debug('Test: set PM2 HOME to ' + process.env.PM2_HOME);
process.on('exit', function () {
    if (process.env.PM2_HOME.match(/\.pm2\/?$/)) {
        debug('Test: removing .pm2 to clean');
        _child_process2.default.execSync('rm -rf ' + process.env.PM2_HOME);
    }
});

var bootstrap = require('..').default;

describe('bootstrap', function () {
    it('should be a object', function (done) {
        debug('Test: bootstrap');
        bootstrap.should.be.an.instanceOf(Object);
        done();
    });
    it('should have method start', function (done) {
        debug('Test: bootstrap method start');
        bootstrap.should.have.an.property('start').which.is.an.instanceOf(Function).with.lengthOf(0);
        done();
    });
    it('should have method start_cb', function (done) {
        debug('Test: bootstrap method start_cb');
        bootstrap.should.have.an.property('start_cb').which.is.an.instanceOf(Function).with.lengthOf(1);
        done();
    });
    it('should have method use', function (done) {
        debug('Test: bootstrap method use');
        bootstrap.should.have.an.property('use').which.is.an.instanceOf(Function).with.lengthOf(1);
        done();
    });
    it('should have property config as Default Config', function (done) {
        debug('Test: bootstrap property config');
        bootstrap.should.have.an.property('config').which.is.an.instanceOf(Object);
        Object.keys(bootstrap.config).length.should.be.exactly(Object.keys(_default2.default).length);
        for (var key in bootstrap.config) {
            bootstrap.config[key].should.be.equal(_default2.default[key]);
        }
        done();
    });
    it('should have property hooks as an empty array', function (done) {
        debug('Test: bootstrap property hooks');
        bootstrap.should.have.an.property('hooks').which.is.an.instanceOf(Array).with.lengthOf(0);
        done();
    });
});

var hook_handler_executed = false;
var hook_handler = function hook_handler() {
    hook_handler_executed = true;
};

describe('bootstrap.use', function () {
    it('should throw error if given argument is not a function', function (done) {
        debug('Test: bootstrap.use(null)');
        var error = undefined;
        try {
            bootstrap.use(null);
        } catch (e) {
            error = e;
        }
        error.should.be.an.instanceOf(Error);
        done();
    });
    it('should add the handler into bootstrap.hooks', function (done) {
        debug('Test: bootstrap.use(hook_handler)');
        bootstrap.use(hook_handler);
        bootstrap.hooks.should.be.an.instanceOf(Array).with.lengthOf(1);
        bootstrap.hooks[0].should.be.exactly(hook_handler);
        hook_handler_executed.should.be.exactly(false);
        debug('Test: bootstrap.use(hook_handler) clear hooks');
        bootstrap.hooks.pop();
        done();
    });
});

describe('bootstrap.configure', function () {
    it('should set pm disabled by config', function (done) {
        debug('Test: bootstrap.configure({ pm: { enable: false }})');
        bootstrap.configure({
            pm: { enable: false }
        });
        bootstrap.config.pm.enable.should.be.exactly(false);
        debug('Test: bootstrap.configure({ pm: { enable: false }}) clean');
        bootstrap.configure(_default2.default);
        done();
    });
});

describe('bootstrap.start', function () {
    // starting and stopping pm2 would cost more than 2000ms
    this.timeout(10000);
    it('should start the app if starting an app', function (done) {
        debug('Testing: killing PM2 to prepare for test');
        _child_process2.default.execSync('./pm2.sh kill');
        debug('Testing: starting app.js');
        _child_process2.default.exec('node --harmony examples/app.js', function (err, stdout, stderr) {
            debug('Testing: app.js started!');
            stdout.should.be.an.instanceOf(String);
            stdout.should.be.exactly('[Lark-PM2] Start OK\n');
            debug('Testing: killing PM2 to clean');
            _child_process2.default.execSync('./pm2.sh kill');
            done();
        });
    });

    it('should restart if starting an existing app', function (done) {
        debug('Testing: killing PM2 to prepare for test');
        _child_process2.default.execSync('./pm2.sh kill');
        debug('Testing: starting app.js for test restart');
        _child_process2.default.execSync('node --harmony examples/app.js');
        debug('Testing: restarting app.js');
        _child_process2.default.exec('node --harmony examples/app.js', function (err, stdout, stderr) {
            debug('Testing: app.js restarted!');
            stdout.should.be.an.instanceOf(String);
            stdout.should.be.exactly('[Lark-PM2] Restart OK\n');
            debug('Testing: killing PM2 to clean');
            _child_process2.default.execSync('./pm2.sh kill');
            done();
        });
    });

    it('should restart if restarting an existing app', function (done) {
        debug('Testing: killing PM2 to prepare for test');
        _child_process2.default.execSync('./pm2.sh kill');
        debug('Testing: starting app.js for test restart');
        _child_process2.default.execSync('node --harmony examples/app.js');
        debug('Testing: restarting app.js');
        _child_process2.default.exec('node --harmony examples/app.js --lark-restart', function (err, stdout, stderr) {
            debug('Testing: app.js restarted!');
            stdout.should.be.an.instanceOf(String);
            stdout.should.be.exactly('[Lark-PM2] Restart OK\n');
            debug('Testing: killing PM2 to clean');
            _child_process2.default.execSync('./pm2.sh kill');
            done();
        });
    });

    it('should fail if restarting an none-existing app', function (done) {
        debug('Testing: killing PM2 to prepare for test');
        _child_process2.default.execSync('./pm2.sh kill');
        debug('Testing: restarting app.js');
        _child_process2.default.exec('node --harmony examples/app.js --lark-restart', function (err, stdout, stderr) {
            debug('Testing: app.js restarted!');
            stdout.should.be.an.instanceOf(String);
            stdout.should.be.exactly('Error : process name not found\n[Lark-PM2] Restart Fail!\n');
            debug('Testing: killing PM2 to clean');
            _child_process2.default.execSync('./pm2.sh kill');
            done();
        });
    });

    it('should be stopped if stopping an app', function (done) {
        debug('Testing: killing PM2 to prepare for test');
        _child_process2.default.execSync('./pm2.sh kill');
        debug('Testing: starting app.js for test stop');
        _child_process2.default.execSync('node --harmony examples/app.js');
        _child_process2.default.exec('node --harmony examples/app.js --lark-stop', function (err, stdout, stderr) {
            debug('Testing: app.js stopped!');
            stdout.should.be.an.instanceOf(String);
            stdout.should.be.exactly('[Lark-PM2] Stop OK\n');
            debug('Testing: killing PM2 to clean');
            _child_process2.default.execSync('./pm2.sh kill');
            done();
        });
    });

    it('should fail if stopping an none-existing app', function (done) {
        debug('Testing: killing PM2 to prepare for test');
        _child_process2.default.execSync('./pm2.sh kill');
        debug('Testing: stopping app.js');
        _child_process2.default.exec('node --harmony examples/app.js --lark-stop', function (err, stdout, stderr) {
            debug('Testing: app.js restarted!');
            stdout.should.be.an.instanceOf(String);
            stdout.should.be.exactly('Error : process name not found\n[Lark-PM2] Stop Fail!\n');
            debug('Testing: killing PM2 to clean');
            _child_process2.default.execSync('./pm2.sh kill');
            done();
        });
    });

    it('should be deleted if deleting an app', function (done) {
        checkPm2(function (cb) {
            debug('Testing: killing PM2 to prepare for test');
            _child_process2.default.execSync('./pm2.sh kill');
            debug('Testing: starting app.js for test delete');
            _child_process2.default.execSync('node --harmony examples/app.js');
            _child_process2.default.exec('node --harmony examples/app.js --lark-delete', function (err, stdout, stderr) {
                debug('Testing: app.js stopped!');
                stdout.should.be.an.instanceOf(String);
                stdout.should.be.exactly('[Lark-PM2] Delete OK\n');
                cb(done);
            });
        });
    });

    it('should kill PM2 if killing an app', function (done) {
        checkPm2(function (cb) {
            debug('Testing: killing PM2 to prepare for test');
            _child_process2.default.execSync('./pm2.sh kill');
            debug('Testing: starting app.js for test delete');
            _child_process2.default.execSync('node --harmony examples/app.js');
            _child_process2.default.exec('node --harmony examples/app.js --lark-kill', function (err, stdout, stderr) {
                debug('Testing: app.js stopped!');
                stdout.should.be.an.instanceOf(String);
                stdout.should.be.exactly('');
                cb(done);
            });
        });
    });
});

function checkPm2(fn) {
    var PM2_CHECK = true;
    debug('Testing: check if PM2 is running for other services');
    _child_process2.default.exec('ps -elf | grep PM2 | grep -v grep', function (err, stdout, stderr) {
        if (stdout) {
            PM2_CHECK = false;
        }
        fn(function (done) {
            if (!PM2_CHECK) {
                debug('Testing: since PM2 is running for other services, will not check if PM2 is killed');
                debug('Testing: You\'d better stop all PM2 and test agian');
                return done();
            }
            debug('Testing: check if PM2 is killed');
            _child_process2.default.exec('ps -elf | grep PM2 | grep -v grep', function (err, stdout, stderr) {
                stdout.should.be.an.instanceOf(String);
                stdout.should.be.exactly('');
                done();
            });
        });
    });
}