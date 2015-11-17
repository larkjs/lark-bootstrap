lark-bootstrap
==============

[![NPM version][npm-image]][npm-url]
[![Travis Build][build-image]][build-url]
[![NPM downloads][downloads-image]][npm-url]

bootstrap lark by pm2

## install

```
$ npm install lark-bootstrap
```

## usage

```
/**
 * Async await mode
 **/
import bootstrap from 'lark-bootstrap';

bootstrap.use(async () => {
    console.log('This will be executed when worker process is running');
});

async function boot () {
    await bootstrap.start();
    //run your app
}

boot();
```

Run `$ node app.js` or `$ node app.js --lark-start` to start.

By default, bootstrap will start your app in multi-processes mode, managed by PM2

Use `$ node app.js --lark-stop` `$ node app.js --lark-restart` `$ node app.js --lark-reload` 

`$ node app.js --lark-delete` `$ node app.js --lark-kill` to manage runing state.

## ES5 style

```
bootstrap.use(function () {
    return new Promise(function (resolve, reject) {
        console.log('This will be executed when worker process is running');
        resolve();
    })
});

bootstrap.start_cb(function () {
    //run your app
});
```

[npm-image]: https://img.shields.io/npm/v/lark-bootstrap.svg?style=flat-square
[npm-url]: https://npmjs.org/package/lark-bootstrap
[build-image]: https://travis-ci.org/larkjs/lark-bootstrap.svg?branch=master
[build-url]: https://travis-ci.org/larkjs/lark-bootstrap
[downloads-image]: https://img.shields.io/npm/dm/lark-bootstrap.svg?style=flat-square
