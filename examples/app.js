'use strict';

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

debug('Example: create new http app');
const app = http.createServer((req, res) => {
    console.log(req.method + ' ' + req.url);
    res.write("OK");
    res.end();
});

debug('Example: use middleware to show worker info');
bootstrap.use(async (ctx) => {
    debug("Example: worker " + process.pid + " started");
});

debug('Example: start bootstrap');
if (process.argv.indexOf('cb') == -1) {
    debug("Example: start in async await mode");
    (async () => {
        try {
            await bootstrap.start();
            debug('Example: bootstrap started');
        }
        catch (e) {
            console.log(e.stack);
            process.exit(1);
        }
        app.listen(3000, () => {
            debug('Example: app listening on 3000');
        });
    })();
}
else {
    debug("Example: start in callback mode");
    bootstrap.start_cb((e) => {
        debug('Example: bootstrap started');
        if (e) {
            console.log(e.stack);
            process.exit(1);
        }
        app.listen(3000, () => {
            debug('Example: app listening on 3000');
        });
    });
}
