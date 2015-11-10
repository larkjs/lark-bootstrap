'use strict';

/**
 * Lark Bootstrap
 * Initialize an nodejs app / Koa app / Lark app
 **/

import extend         from 'extend';
import _debug         from 'debug';
import pm             from './lib/pm';
import DEFAULT_CONFIG from './config/default.json';

const debug = _debug('lark-bootstrap');

const bootstrap = {
    config: {},
    hooks: [],
};

/**
 * Configure
 **/
let configured = false;
bootstrap.configure = (config) => {
    if (configured) {
        return bootstrap;
    }
    debug('Bootstrap: configure');
    configured = true;
    config = extend(true, {}, config);
    bootstrap.config = extend(true, config, DEFAULT_CONFIG);
    return bootstrap;
};

/**
 * Bootstrap current service
 **/
bootstrap.start = async (cb) => {
    debug('Bootstrap: start');
    bootstrap.configure();
    let state = await pm(bootstrap.config.pm);
    if (state.isMaster) {
        return result;
    }
    const ctx = {
        bootstrap: bootstrap,
        config: extend(true, {}, bootstrap.config),
        state : extend(true, {}, state),
    };
    for (let i = 0; i < bootstrap.hooks.length; i++) {
        let fn = bootstrap.hooks[i];
        await fn(ctx);
    }
    if (cb instanceof Function) {
        state.result = cb(ctx);
    }
    return state;
};

/**
 * Add hooks before booting
 **/
bootstrap.use = (fn) => {
    debug('Bootstrap: use');
    if (!(fn instanceof Function)) {
        throw new Error('Param for Bootstrap.use must be a Function!');
    }
    bootstrap.hooks.push(fn);
    return bootstrap;
};

export default bootstrap;

debug('Bootstrap: script loaded');
