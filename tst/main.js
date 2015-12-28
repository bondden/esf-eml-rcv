/**
 * Created by Denis Bondarenko <bond.den@gmail.com> on 29.06.2015.
 */
'use strict';
//require('babel/polyfill');

var
	expect   = require('chai').expect,
	assert   = require('chai').assert,
	clc 		 = require('cli-color'),
	path	 	 = require('path'),
	fs  	 	 = require('fs-extra'),

	App      = require('../index.js').EmlRcv
;

function aZ(v){
	return (v<10)?'0'+v:v;
}

var app;
var name;
var createdDir=false;
var curDate;

describe('ESF-Mail-Receiver Suit',function(){

	before(function(done){
		fs.emptyDir(path.resolve(__dirname+'/d/eml/rcv'),function(e){
			if(e){
				done(e);
			}else{
				done();
			}
		});
	});

	describe('Initialization',function(){

		it('It should init the app',function(done){
			app=new App();
			assert.typeOf(app, 'object');
			assert.equal(app.hasOwnProperty('cfg'),true);
			done();
		});

		it('It should load tst config',function(done){
			app.loadConfig().catch(function(e){
				done(e);
			}).then(function(r){
				assert(r,'object');
				done();
			});
		});

	});

	describe('Preparing',function(){

		curDate=new Date();
		name=curDate.getFullYear()+'-'+aZ(curDate.getMonth()+1)+'-'+aZ(curDate.getDate())+'_'+aZ(curDate.getHours())+'-'+aZ(curDate.getMinutes())+'-'+aZ(curDate.getSeconds());

		it('getCurrentDateTime(): It should get current date-time',function(done){
			var appDate=app.getCurrentDateTime().split(/[_\-]/);
			assert.equal(parseInt(appDate[0]),curDate.getFullYear());
			assert.equal(parseInt(appDate[1]),curDate.getMonth()+1);
			assert.equal(parseInt(appDate[2]),curDate.getDate());
			assert.equal(parseInt(appDate[3]),curDate.getHours());
			assert.equal(parseInt(appDate[4]),curDate.getMinutes());
			done();
		});

		it('createFolders(name): It should create a folder with name "'+name+'"',function(done){

			app.createFolders(name).catch(function(e){
				done(e);
			}).then(function(dirName){

				fs.readdir(dirName,function(e,r){
					if(e){
						done(e);
					}else{
						createdDir=dirName;
						assert.equal(dirName,path.resolve(__dirname+'/../'+app.cfg.local.path+name));
						done();
					}
				});

			});
		});

	});

	describe('receiveMail(operationDir)',function(){
		this.timeout(60000);

		it('It receive 6 raw emails with xls, xlsx attachments for 13.03.2015-15.03.2015 interval',function(done){

			if(!createdDir){
				done(new Error('Directory '+path.resolve(__dirname+'/'+app.cfg.local.path+name)+' does not exist'));
				return;
			}

			app.receiveMail(createdDir).catch(function(e){
				done(e);
			}).then(function(r){

				fs.readdir(path.resolve(__dirname+'/../'+app.cfg.local.path+name),function(e,r){
					if(e){
						done(e);
					}else{

						if(r.length==0){
							done(new Error('No e-mails, satisfying rules received'));
							return;
						}

						assert.equal(r.length,6);

						done();
					}
				});

			});
		});

	});

	describe('extractAttachments(): It should extract attachment from raw mails',function(){
		this.timeout(30000);

		var attDir=path.resolve(createdDir+'/att');

		it('There should exist a subdirectory "att" in raw mails directory',function(done){

			fs.readdir(attDir,function(e,r){
				if(e){
					done(e);
				}else{
					done();
				}
			});

		});

		it('There should be 7 xls and xlsx files in subdirectory "att"',function(done){

			fs.readdir(attDir,function(e,r){
				if(e){
					done(e);
					return;
				}

				expect.equal(r.length,7);

				r.forEach(function(v,i,a){

				});

			});

		});

	});

});
