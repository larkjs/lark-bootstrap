/**
 * Lark Bootstrap
 * Initialize an nodejs app / Koa app / Lark app
 **/

import extend         from 'extend';
import pm             from './lib/pm';
import DEFAULT_CONFIG from './config/default.json';

/**
 * class Bootstrap
 **/
class Bootstrap {
    constructor (app, config) {
        this.app = app;
        this.config = extend(true, config || {}, DEFAULT_CONFIG);
        this.hooks = [];
    }
    async start (cb) {
        let result = pm(this.config.pm);
        if (result.isMaster) {
            return result;
        }
        const ctx = {
            bootstrap: this,
            app: this.app,
            config: extend(true, {}, this.config),
            pm : extend(true, {}, result),
        };
        for (let i = 0; i < this.hooks.length; i++) {
            let fn = this.hooks[i];
            await fn(ctx);
        }
        if (cb instanceof Function) {
            result.result = await cb(ctx);
        }
        return result;
    }
    use (fn) {
        if (!(fn instanceof Function)) {
            throw new Error('Param for Bootstrap.use must be a Function!');
        }
        this.hooks.push(fn);
        return this;
    }
}

export default Bootstrap;
