var async = require('async');
var extend  = require('extend');
var fs    = require('fs');
var path  = require('path');

var configPath = '../config';

module.exports = function(app, uconfig){
    if(typeof uconfig != 'object') throw new Error('Config must be an object');
    var config = {};
    fileList = fs.readdirSync(path.join(__dirname, configPath)).filter(function(name){
        if(name[0] == '.') return false;
        return true;
    });
    fileList.forEach(function(file){
        config[path.basename(file, path.extname(file))] =
            require(path.join(__dirname, configPath, file));
    });

    for(var key in config){
        if(uconfig[key] && typeof uconfig[key] != 'object') return;
        else{
            uconfig[key] = extend(config[key], uconfig[key]);
        } 
    }

    app.root = process.mainModule;
}
