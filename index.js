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
    config: DEFAULT_CONFIG,
    hooks: [],
};

/**
 * Configure
 **/
let started = false;
bootstrap.configure = (config) => {
    if (started) {
        throw new Error("Can not configure after bootstrap started!");
    }
    debug('Bootstrap: configure');
    config = extend(true, {}, config);
    bootstrap.config = extend(true, bootstrap.config, config);
    return bootstrap;
};

/**
 * Bootstrap current service
 **/
bootstrap.async_start = async () => {
    debug('Bootstrap: start in async function');
    bootstrap.configure();
    started = true;
    let state;
    if (bootstrap.config.pm && bootstrap.config.pm.enable !== false) {
        state = await pm(bootstrap.config.pm);
    }
    if (state.isMaster) {
        process.exit(0);
    }
    const ctx = {
        bootstrap: bootstrap,
        config: extend(true, {}, bootstrap.config),
    };
    if (state) {
        ctx.state = extend(true, {}, state);
    }
    for (let i = 0; i < bootstrap.hooks.length; i++) {
        let fn = bootstrap.hooks[i];
        await fn(ctx);
    }
};

/**
 * Bootstrap start, returning a promise
 **/
bootstrap.start = () => {
    debug('Bootstrap: start');
    return new Promise((resolve, reject) => {
        (async () => {
            try {
                await bootstrap.async_start();
            }
            catch (e) {
                return reject(e);
            }
            return resolve();
        })();
    });
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
