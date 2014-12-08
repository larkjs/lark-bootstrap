var koa   = require('koa');
var init  = require('lark-koa-init');

var app = koa();

init.before(function(next){
    console.log("Before init");
    return next();
});

init.after(function(next){
    console.log("After init");
    return next();
});

app.use(init(app));

app.use(function*(next){
    this.body = 'hello';
    yield next;
});

app.listen(8555);
