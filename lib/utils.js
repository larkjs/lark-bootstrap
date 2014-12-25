var fs = require('fs');
var path = require('path');

var utils = exports;

exports.mkdirSyncP = function(_path){
    var paths = _path.split('/');
    var _path = paths.shift();
    paths.forEach(function(item){
        _path = _path + '/' + item;
        exports.mkdirSync(_path);
    });
}

exports.mkdirSync = function(_path){
    if(fs.existsSync(_path)){
        if(fs.statSync(_path).isDirectory()){
            return;
        }
        throw new Error("Path is an existing file");
    }
    else{
        fs.mkdirSync(_path);
    }
}

exports.makeFsCreateDir = function(){
    fs.open     = autoCreateDir(fs.open);
    fs.openSync = autoCreateDir(fs.openSync);

    function autoCreateDir(old){
        return function(_path, flags, mode){
            var dir = path.dirname(_path);
            if(!dir.match(/node_modules/)){
                utils.mkdirSyncP(dir);
            };
            return old.apply(fs,[].slice.call([].slice.call(arguments)));
        };
    };
};
