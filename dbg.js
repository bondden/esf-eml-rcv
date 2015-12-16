'use strict';
//require('babel/polyfill');

var cc 		 = require('cli-color');

process.on('unhandledRejection', function(reason, p) {
	console.log('\nUnhandled Rejection at: Promise ', p, ' reason: ', reason,'\n');
	console.trace(p);
});

var App    = require('./index.js').EmlRcv;

var app=new App();

app.run().then(function(r){
	console.log(r);
}).catch(function(e){
	console.log(cc.red('Error'));
	console.log(e);
});
