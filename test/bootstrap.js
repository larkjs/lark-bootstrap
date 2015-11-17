/**
 * lark - lark-bootstrap test cases
 **/
'use strict';

import _debug from 'debug';
import should from 'should';
import path   from 'path';
import cp     from 'child_process';
import DEFAULT_CONFIG   from '../config/default.json';
const  debug  = _debug('lark-bootstrap');

cp._exec = cp.exec;
cp._execSync = cp.execSync;

cp.exec = (command, options, callback) => {
    command = 'DEBUG=NONE ' + command;
    return cp._exec(command, options, callback);
}

cp.execSync = (command, options) => {
    command = 'DEBUG=NONE ' + command;
    return cp._execSync(command, options);
}

debug('Test: starting test lark-bootstrap');

process.env.PM2_HOME = path.dirname(__dirname);
debug('Test: set PM2 HOME to ' + process.env.PM2_HOME);
process.on('exit', () => {
    if (process.env.PM2_HOME.match(/\.pm2\/?$/)) {
        debug('Test: removing .pm2 to clean');
        cp.execSync('rm -rf ' + process.env.PM2_HOME);
    }
});

const bootstrap = require('..').default;

describe('bootstrap', () => {
    it('should be a object', done => {
        debug('Test: bootstrap');
        bootstrap.should.be.an.instanceOf(Object);
        done();
    });
    it('should have method start', done => {
        debug('Test: bootstrap method start');
        bootstrap.should.have.an.property('start')
            .which.is.an.instanceOf(Function)
            .with.lengthOf(0);
        done();
    });
    it('should have method start_cb', done => {
        debug('Test: bootstrap method start_cb');
        bootstrap.should.have.an.property('start_cb')
            .which.is.an.instanceOf(Function)
            .with.lengthOf(1);
        done();
    });
    it('should have method use', done => {
        debug('Test: bootstrap method use');
        bootstrap.should.have.an.property('use')
            .which.is.an.instanceOf(Function)
            .with.lengthOf(1);
        done();
    });
    it('should have property config as Default Config', done => {
        debug('Test: bootstrap property config');
        bootstrap.should.have.an.property('config')
            .which.is.an.instanceOf(Object);
        (Object.keys(bootstrap.config).length).should.be.exactly(Object.keys(DEFAULT_CONFIG).length);
        for (var key in bootstrap.config) {
            bootstrap.config[key].should.be.equal(DEFAULT_CONFIG[key]);
        }
        done();
    });
    it('should have property hooks as an empty array', done => {
        debug('Test: bootstrap property hooks');
        bootstrap.should.have.an.property('hooks')
            .which.is.an.instanceOf(Array)
            .with.lengthOf(0);
        done();
    });
})

let hook_handler_executed = false;
let hook_handler = () => {
    hook_handler_executed = true;
}

describe('bootstrap.use', () => {
    it('should throw error if given argument is not a function', done => {
        debug('Test: bootstrap.use(null)');
        let error;
        try {
            bootstrap.use(null);
        }
        catch (e) {
            error = e;
        }
        error.should.be.an.instanceOf(Error);
        done();
    });
    it('should add the handler into bootstrap.hooks', done => {
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

describe('bootstrap.configure', () => {
    it('should set pm disabled by config', done => {
        debug('Test: bootstrap.configure({ pm: { enable: false }})');
        bootstrap.configure({
            pm: { enable: false }
        });
        bootstrap.config.pm.enable.should.be.exactly(false);
        debug('Test: bootstrap.configure({ pm: { enable: false }}) clean');
        bootstrap.configure(DEFAULT_CONFIG);
        done();
    });
});

describe('bootstrap.start', function () {
    // starting and stopping pm2 would cost more than 2000ms
    console.log('    please wait patiently, this test costs some time since it starts and stops PM2 several times');
    this.timeout(60000);
    it('should start the app if starting an app', done => {
        debug('Testing: killing PM2 to prepare for test');
        cp.execSync('./pm2.sh kill');
        debug('Testing: starting app.js');
        let stdout = cp.execSync('node --harmony examples/app.js');
        debug('Testing: app.js started!');
        stdout.should.be.an.instanceOf(Buffer);
        stdout.toString().should.be.exactly('[Lark-PM2] Start OK\n');
        debug('Testing: killing PM2 to clean');
        cp.execSync('./pm2.sh kill');
        done();
    });

    it('should restart if starting an existing app', done => {
        debug('Testing: killing PM2 to prepare for test');
        cp.execSync('./pm2.sh kill');
        debug('Testing: starting app.js for test restart');
        cp.execSync('node --harmony examples/app.js');
        debug('Testing: restarting app.js');
        let stdout = cp.execSync('node --harmony examples/app.js');
        debug('Testing: app.js restarted!');
        stdout.should.be.an.instanceOf(Buffer);
        stdout.toString().should.be.exactly('[Lark-PM2] Restart OK\n');
        debug('Testing: killing PM2 to clean');
        cp.execSync('./pm2.sh kill');
        done();
    });

    it('should restart if restarting an existing app', done => {
        debug('Testing: killing PM2 to prepare for test');
        cp.execSync('./pm2.sh kill');
        debug('Testing: starting app.js for test restart');
        cp.execSync('node --harmony examples/app.js');
        debug('Testing: restarting app.js');
        let stdout = cp.execSync('node --harmony examples/app.js --lark-restart');
        debug('Testing: app.js restarted!');
        stdout.should.be.an.instanceOf(Buffer);
        stdout.toString().should.be.exactly('[Lark-PM2] Restart OK\n');
        debug('Testing: killing PM2 to clean');
        cp.execSync('./pm2.sh kill');
        done();
    });

    it('should fail if restarting an none-existing app', done => {
        debug('Testing: killing PM2 to prepare for test');
        cp.execSync('./pm2.sh kill');
        debug('Testing: restarting app.js');
        let stdout = cp.execSync('node --harmony examples/app.js --lark-restart');
        debug('Testing: app.js restarted!');
        stdout.should.be.an.instanceOf(Buffer);
        stdout.toString().should.be.exactly('Error : process name not found\n[Lark-PM2] Restart Fail!\n');
        debug('Testing: killing PM2 to clean');
        cp.execSync('./pm2.sh kill');
        done();
    });

    it('should be stopped if stopping an app', done => {
        debug('Testing: killing PM2 to prepare for test');
        cp.execSync('./pm2.sh kill');
        debug('Testing: starting app.js for test stop');
        cp.execSync('node --harmony examples/app.js');
        let stdout = cp.execSync('node --harmony examples/app.js --lark-stop');
        debug('Testing: app.js stopped!');
        stdout.should.be.an.instanceOf(Buffer);
        stdout.toString().should.be.exactly('[Lark-PM2] Stop OK\n');
        debug('Testing: killing PM2 to clean');
        cp.execSync('./pm2.sh kill');
        done();
    });

    it('should fail if stopping an none-existing app', done => {
        debug('Testing: killing PM2 to prepare for test');
        cp.execSync('./pm2.sh kill');
        debug('Testing: stopping app.js');
        let stdout = cp.execSync('node --harmony examples/app.js --lark-stop');
        debug('Testing: app.js restarted!');
        stdout.should.be.an.instanceOf(Buffer);
        stdout.toString().should.be.exactly('Error : process name not found\n[Lark-PM2] Stop Fail!\n');
        debug('Testing: killing PM2 to clean');
        cp.execSync('./pm2.sh kill');
        done();
    });

    it('should be deleted if deleting an app', done => {
        debug('Testing: killing PM2 to prepare for test');
        cp.execSync('./pm2.sh kill');
        debug('Testing: starting app.js for test delete');
        cp.execSync('node --harmony examples/app.js');
        let stdout = cp.execSync('node --harmony examples/app.js --lark-delete');
        debug('Testing: app.js stopped!');
        stdout.should.be.an.instanceOf(Buffer);
        stdout.toString().should.be.exactly('[Lark-PM2] Delete OK\n');
        done();
    });

    it('should kill PM2 if killing an app', done => {
        debug('Testing: killing PM2 to prepare for test');
        cp.execSync('./pm2.sh kill');
        debug('Testing: starting app.js for test delete');
        cp.execSync('node --harmony examples/app.js');
        let stdout = cp.execSync('node --harmony examples/app.js --lark-kill');
        debug('Testing: app.js stopped!');
        stdout.should.be.an.instanceOf(Buffer);
        stdout.toString().should.be.exactly('');
        done();
    });
});

function checkPm2(fn, done) {
    let PM2_CHECK = true;
    debug('Testing: check if PM2 is running for other services');
    let stdout = cp.execSync('ps -elf | grep PM2 | grep -v grep');
    if (stdout.toString()) {
        PM2_CHECK = false;
    }
    fn();
    if (!PM2_CHECK) {
        debug('Testing: since PM2 is running for other services, will not check if PM2 is killed');
        debug('Testing: You\'d better stop all PM2 and test agian');
        return done();
    }
    debug('Testing: check if PM2 is killed');
    stdout = cp.execSync('ps -elf | grep PM2 | grep -v grep');
    stdout.should.be.an.instanceOf(Buffer);
    stdout.toString().should.be.exactly('');
    done();
}
