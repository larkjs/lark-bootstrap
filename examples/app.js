/**
 * Example & Test file, bootstrap app
 * `node app` to start
 * `node app --lark-stop` to stop
 * `node app --lark-watch` to watch
 **/
import http       from 'http';
import bootstrap  from '..';

console.log('creating app');
const app = http.createServer((req, res) => {
    console.log(req.method + ' ' + req.url);
    res.write("OK");
    res.end();
});

console.log('adding hook');
bootstrap.use(async (ctx) => {
    console.log("Worker " + process.pid + " started!");
});

console.log('starting');
let result = bootstrap.start(() => {
    console.log('started!');
    return app.listen(3000, () => {
        console.log("App listening on 3000");
    });
});
