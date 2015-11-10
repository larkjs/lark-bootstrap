/**
 * Example & Test file, bootstrap app
 * `node app` to start
 * `node app --lark-stop` to stop
 * `node app --lark-watch` to watch
 **/
import http       from 'http';
import _debug     from 'debug';
import bootstrap  from '..';

const debug = _debug('lark-bootstrap');

debug('creating a new http app');
const app = http.createServer((req, res) => {
    console.log(req.method + ' ' + req.url);
    res.write("OK");
    res.end();
});

debug('adding a hook on bootstrap, showing worker message');
bootstrap.use(async (ctx) => {
    console.log("Worker " + process.pid + " started!");
});

debug('starting bootstrap');
let result = bootstrap.start(() => {
    debug('bootstrap started!');
    return app.listen(3000, () => {
        console.log("App listening on 3000");
    });
});
