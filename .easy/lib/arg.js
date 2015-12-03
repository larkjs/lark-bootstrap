'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * handle lark-bootstrap command args
 **/

var LarkArg = (function () {
    function LarkArg(prefix) {
        var _this = this;

        _classCallCheck(this, LarkArg);

        if (!prefix || 'string' !== typeof prefix) {
            prefix = '--lark-';
        }
        this.prefix = prefix;
        var scriptArgs = [];
        this.args = {};
        process.argv.forEach(function (arg) {
            var match = arg.match(new RegExp("^" + prefix + "(.*)$"));
            if (!match) {
                scriptArgs.push(arg);
                return;
            }
            var larkArg = match[1];
            var larkArgSplit = larkArg.split('=');
            var key = larkArgSplit[0];
            if (_this[key]) {
                throw new Error("Can not use arg as a argument, Duplicated in LarkArg");
            }
            var value = larkArgSplit.length >= 1 ? larkArgSplit.join('=') : true;
            _this.args[key] = value;
            _this[key] = value;
        });
        process.argv = scriptArgs;
        process.larkArgv = this.args;
    }

    _createClass(LarkArg, [{
        key: 'exists',
        value: function exists() {
            return Object.keys(process.larkArgv).length > 0;
        }
    }, {
        key: 'toCmdArg',
        value: function toCmdArg(arg) {
            return this.prefix + arg;
        }
    }]);

    return LarkArg;
})();

exports.default = LarkArg;