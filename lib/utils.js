var fs = require('fs');
var path = require('path');

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
