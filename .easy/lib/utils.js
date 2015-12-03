'use strict'

/**
 * Utils
 **/

;
Object.defineProperty(exports, "__esModule", {
    value: true
});
var utils = {};

exports.default = utils;

/**
 * Check if arr1 is exactly equal with arr2
 **/

utils.arrayEqual = function (arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length != arr2.length) {
        return false;
    }
    for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] != arr2[i]) {
            return false;
        }
    }
    return true;
};