'use strict'

/**
 * Example & Test file, bootstrap app
 * `node app` to start
 * `node app --lark-stop` to stop
 * `node app --lark-watch` to watch
 **/
;

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _debug2 = require('debug');

var _debug3 = _interopRequireDefault(_debug2);

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } step("next"); }); }; }

var debug = (0, _debug3.default)('lark-bootstrap');

debug('Example: create new http app');
var app = _http2.default.createServer(function (req, res) {
    console.log(req.method + ' ' + req.url);
    res.write("BOOTSTRAP SERVICE OK");
    res.end();
});

debug('Example: use middleware to show worker info');
_2.default.use((function () {
    var ref = _asyncToGenerator(function* (ctx) {
        debug("Example: worker " + process.pid + " started");
    });

    return function (_x) {
        return ref.apply(this, arguments);
    };
})());

debug('Example: start bootstrap');
if (process.argv.indexOf('cb') == -1) {
    debug("Example: start in async await mode");
    _asyncToGenerator(function* () {
        try {
            yield _2.default.start();
            debug('Example: bootstrap started');
        } catch (e) {
            console.log(e.stack);
            process.exit(1);
        }
        app.listen(3000, function () {
            debug('Example: app listening on 3000');
        });
    })();
} else {
    debug("Example: start in callback mode");
    _2.default.start().then(function () {
        debug('Example: bootstrap started');
        app.listen(3000, function () {
            debug('Example: app listening on 3000');
        });
    }).catch(function (e) {
        console.log(e.stack);
        process.exit(1);
    });
}