'use strict';

module.exports = arg;

let args = {};
let prefix = '';
let inited =false;

function arg(name){
    if(!inited) throw new Error("Args handler not inited");
    return args[name];
};

arg.toCmdArg = function(name){
    if(!inited) throw new Error("Args handler not inited");
    return prefix + name;
}

arg.inited = function(){
    return !!inited;
}

arg.exists = function(){
    return !!Object.keys(args).length;
}

arg.init = function(config, ignore_if_inited){
    if(ignore_if_inited !== true) ignore_if_inited = false;
    config = config || {};
    if(inited){
        if(ignore_if_inited) return;
        throw new Error("Args handler can not be inited twice");
    }
    inited = true;
    prefix = config.prefix || '--lark-';
    let _args = [];
    process.argv.forEach(function(arg){
        let match = arg.match(new RegExp("^"+prefix+"(.*)$"));
        if(!match){
            _args.push(arg);
            return;
        }
        let arg = match[1];
        let sarg = arg.split('=');
        let key = sarg[0];
        let value = sarg.length > 1 ? sarg.slice(1).join('=') : true;
        args[key] = value;
    });
    process.argv = _args;
    process.larkArgv = args;
};
