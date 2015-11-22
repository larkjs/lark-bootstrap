'use strict'

/**
 * Lark Bootstrap
 * Initialize an nodejs app / Koa app / Lark app
 **/

;
Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _debug2 = require('debug');

var _debug3 = _interopRequireDefault(_debug2);

var _pm = require('./lib/pm');

var _pm2 = _interopRequireDefault(_pm);

var _default = require('./config/default.json');

var _default2 = _interopRequireDefault(_default);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, "next"); var callThrow = step.bind(null, "throw"); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

var debug = (0, _debug3.default)('lark-bootstrap');

var bootstrap = {
    config: _default2.default,
    hooks: []
};

/**
 * Configure
 **/
var started = false;
bootstrap.configure = function (config) {
    if (started) {
        throw new Error("Can not configure after bootstrap started!");
    }
    debug('Bootstrap: configure');
    config = (0, _extend2.default)(true, {}, config);
    bootstrap.config = (0, _extend2.default)(true, bootstrap.config, config);
    return bootstrap;
};

/**
 * Bootstrap current service
 **/
bootstrap.async_start = _asyncToGenerator(function* () {
    debug('Bootstrap: start in async function');
    bootstrap.configure();
    started = true;
    var state = undefined;
    if (bootstrap.config.pm && bootstrap.config.pm.enable !== false) {
        state = yield (0, _pm2.default)(bootstrap.config.pm);
    }
    if (state.isMaster) {
        process.exit(0);
    }
    var ctx = {
        bootstrap: bootstrap,
        config: (0, _extend2.default)(true, {}, bootstrap.config)
    };
    if (state) {
        ctx.state = (0, _extend2.default)(true, {}, state);
    }
    for (var i = 0; i < bootstrap.hooks.length; i++) {
        var fn = bootstrap.hooks[i];
        yield fn(ctx);
    }
});

/**
 * Bootstrap start, returning a promise
 **/
bootstrap.start = function () {
    debug('Bootstrap: start');
    return new Promise(function (resolve, reject) {
        _asyncToGenerator(function* () {
            try {
                yield bootstrap.async_start();
            } catch (e) {
                return reject(e);
            }
            return resolve();
        })();
    });
};

/**
 * Add hooks before booting
 **/
bootstrap.use = function (fn) {
    debug('Bootstrap: use');
    if (!(fn instanceof Function)) {
        throw new Error('Param for Bootstrap.use must be a Function!');
    }
    bootstrap.hooks.push(fn);
    return bootstrap;
};

exports.default = bootstrap;

debug('Bootstrap: script loaded');
