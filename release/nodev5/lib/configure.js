'use strict';

const async = require('async');
const extend = require('extend');
const fs = require('fs');
const path = require('path');

const arg = require('./arg');

const configPath = '../config';

module.exports = function (app, uconfig) {
    if (typeof uconfig != 'object') throw new Error('Config must be an object');
    let config = {};
    let fileList = fs.readdirSync(path.join(__dirname, configPath)).filter(function (name) {
        if (name[0] == '.') return false;
        return true;
    });
    fileList.forEach(function (file) {
        config[path.basename(file, path.extname(file))] = require(path.join(__dirname, configPath, file));
    });

    for (let key in config) {
        if (uconfig[key] && typeof uconfig[key] != 'object') return;else {
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