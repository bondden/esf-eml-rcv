/**
 * Created by root on 8/29/15.
 */
'use strict';
require('babel/polyfill');

var
	expect   = require('chai').expect,
	assert   = require('chai').assert,
	clc 		 = require('cli-color'),
	path	 	 = require('path'),
	fs  	 	 = require('fs-extra'),

	App      = require('../index.js').EmlRcv
;

var app;

describe('ESF-Mail-Receiver Single App run',function(){

	it('It should init the app',function(done){

		app=new App();
		assert.typeOf(app, 'object');
		assert.equal(app.hasOwnProperty('cfg'),true);
		done();

	});

	it('It should run',function(done){
		this.timeout(7200000);

		app.run().then(function(r){
			done();
		}).catch(function(e){
			done(e);
		});

	});

});
