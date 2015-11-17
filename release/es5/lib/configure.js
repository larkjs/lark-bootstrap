'use strict';

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

var async = require('async');
var extend = require('extend');
var fs = require('fs');
var path = require('path');

var arg = require('./arg');

var configPath = '../config';

module.exports = function (app, uconfig) {
    if ((typeof uconfig === 'undefined' ? 'undefined' : _typeof(uconfig)) != 'object') throw new Error('Config must be an object');
    var config = {};
    var fileList = fs.readdirSync(path.join(__dirname, configPath)).filter(function (name) {
        if (name[0] == '.') return false;
        return true;
    });
    fileList.forEach(function (file) {
        config[path.basename(file, path.extname(file))] = require(path.join(__dirname, configPath, file));
    });

    for (var key in config) {
        if (uconfig[key] && _typeof(uconfig[key]) != 'object') return;else {
            uconfig[key] = extend(config[key], uconfig[key]);
        }
    }

    configByArgs(uconfig);

    app.root = process.mainModule;
};

function configByArgs(config) {
    if (!config.processManage) config.processManage = {};
    if (arg('name')) {
        config.processManage.name = arg('name');
    }
}