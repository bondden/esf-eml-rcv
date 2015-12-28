'use strict';

var cc=require('cli-color');

process.on('unhandledRejection',(reason,p)=>{
  console.log('\nUnhandled Rejection at: Promise ',p,' reason: ',reason,'\n');
  console.trace(p);
});

var App=require('./index.js').EmlRcv;

var app=new App();

app.run().then((r)=>{
  console.log(r);
}).catch((e)=>{
  console.log(cc.red('Error'));
  console.log(e);
});
