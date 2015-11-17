'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
 * handle lark-bootstrap command args
 **/
class LarkArg {
    constructor(prefix) {
        if (!prefix || 'string' !== typeof prefix) {
            prefix = '--lark-';
        }
        this.prefix = prefix;
        let scriptArgs = [];
        this.args = {};
        process.argv.forEach(arg => {
            let match = arg.match(new RegExp("^" + prefix + "(.*)$"));
            if (!match) {
                scriptArgs.push(arg);
                return;
            }
            let larkArg = match[1];
            let larkArgSplit = larkArg.split('=');
            let key = larkArgSplit[0];
            if (this[key]) {
                throw new Error("Can not use arg as a argument, Duplicated in LarkArg");
            }
            let value = larkArgSplit.length >= 1 ? larkArgSplit.join('=') : true;
            this.args[key] = value;
            this[key] = value;
        });
        process.argv = scriptArgs;
        process.larkArgv = this.args;
    }
    exists() {
        return Object.keys(process.larkArgv).length > 0;
    }
    toCmdArg(arg) {
        return this.prefix + arg;
    }
}

exports.default = LarkArg;