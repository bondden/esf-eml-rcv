/**
 * Created by Denis Bondarenko <bond.den@gmail.com> on 14.08.2015.
 */
"use strict";

const
  Imap      =require('imap'),
  iconv     =require('iconv'),
  MailParser=require("mailparser").MailParser,
  //inspect   =require('util').inspect,
  path      =require('path'),
  fs        =require('fs-extra')
  ;

import * as modBsc from 'esf-bsc';
import * as modUtl from 'esf-utl';

const
  U=modUtl.Utl,
  L=U.log,
  E=U.rejectingError
  ;

export class EmlRcv extends modBsc.Bsc {

  constructor(){
    super();
    this.stat={
      operationDate:         '',
      operationDir:          '',
      messagesFound:         0,
      withAttachments:       0,
      filesReceived:         0,
      sendersTotal:          0,
      receivedFromSendersNum:0,
      attachmentsReceived:   0,
      attachmentsSaved:      0,
      attLog:                [],
      settings:              {}
    };
  }

  getCurrentDateTime(){
    return U.getCurrentDateFmtFFS();
  }
  
  getRtPth(p){
    return path.isAbsolute(p)?p:`${__dirname}/${p}`;
  }

  createFolders(folderName){
    var H=this;
    return new Promise((rs,rj)=>{

      let operationDir=path.resolve(this.getRtPth(H.cfg.local.path)+folderName);
      fs.ensureDir(operationDir,e=>{

        if(e){
          return E(1,'Error creating dir '+operationDir,e,rj);
        }

        H.stat.operationDir=operationDir;

        L(H.stat.operationDir);

        let wtr=[];
        for(let subDirId in H.cfg.local.subDirs){

          if(!H.cfg.local.subDirs.hasOwnProperty(subDirId))return;

          let subDirName=H.cfg.local.subDirs[subDirId];
          wtr.push(
            new Promise((rs1,rj1)=>{

              let subDir=path.resolve(operationDir+'/'+subDirName);
              fs.ensureDir(subDir,e1=>{

                if(e1){
                  return E(2,'Error creating dir '+subDir,e1,rj1);
                }

                rs1(subDir);

              });

            })
          );

        }

        Promise
          .all(wtr)
          .then(rw=>{
            rs(rw.push(operationDir));
          })
          .catch(ew=>{
            E(3,'',ew,rj);
          })
        ;

      });

    });
  }

  //todo: implement esf-eml-rcv-0.3
  processMessage(msgId,buffer,opDir){
    var H=this;
    return new Promise((rs,rj)=>{

      L(`Processing msg #${msgId}...`);

      function detectAttachmentType(s){
        let a=s.split('/');
        return (Array.isArray(a)&&a.length==2)?a[1]: '';
      }

      let file=path.resolve(opDir+'/'+H.cfg.local.subDirs.raw+msgId+'.eml');
      let psr =new MailParser();
      let wtr =[];

      psr.on('end',eml=>{

        let attLogItem={
          msgId:msgId,
          from: eml.from,
          subj: eml.subject,
          date: eml.date,
          att:  []
        };

        //fs.writeFileSync(path.resolve(opDir+'/e0/'+msgId+'.json'),JSON.stringify(eml,null,'\t'),{encoding:"utf8"});

        if(eml.attachments&&eml.attachments.length){

          L('#'+msgId+' attachments:','em');

          H.stat.withAttachments++;

          eml.attachments.forEach((att,i,a)=>{
            
            if(!att.fileName)return;
            L(`Msg ${msgId} has attachment: ${att.fileName}`);

            let fileData={
              ext:      path.extname(att.fileName),
              base:     opDir+'/'+H.cfg.local.subDirs.att+msgId+'-'+i,
              type:     detectAttachmentType(att.contentType),
              name:     att.fileName,
              namGen:   att.generatedFileName,
              tEncoding:att.transferEncoding,
              length:   att.length,
              checksum: att.checksum
            };

            H.stat.attachmentsReceived++;

            let filePath=path.resolve(fileData.base+fileData.ext);

            if(H.cfg.rules.attachmentSubtypes.indexOf(fileData.type)=== -1)return;

            wtr.push(new Promise((rsa,rja)=>{

              L('Saving attachment '+filePath);

              fs.writeFile(
                filePath,
                att.content,
                {encoding:"utf8"},
                ea=>{

                  if(ea){
                    return E(101,'Error saving attachment '+filePath,ea,rja);
                  }

                  attLogItem.att.push(fileData);
                  H.stat.attachmentsSaved++;
                  rsa(filePath);

                }
              );

            }));

          });

        }else{
          wtr.push(new Promise((rsw,rjw)=>{
            rsw(true);
          }));
        }

        Promise
          .all(wtr)
          .then(rw=>{

            H.stat.attLog.push(attLogItem);

            rs(msgId);
          })
          .catch(ew=>{
            E(102,'Error processing msg '+msgId,ew,rj);
          })
        ;

      });

      fs.writeFile(file,buffer,{encoding:"utf8"},ef=>{

        if(ef){
          return E(4,'Error saving raw eml '+file,ef,rj);
        }

        L(file+'\twritten');

        fs.createReadStream(file).pipe(psr);

      });

    });
  }

  initMailBox(){
    var H=this;
    return new Promise((rs,rj)=>{

      try{

        var imap=new Imap(H.cfg.imap);

        imap.once('ready',()=>{
          imap.openBox('INBOX',true,(e1,box)=>{

            if(e1){
              return E(5,'Error opening mail box',e1,rj);
            }

            rs(imap);

          });
        });

        imap.once('error',e2=>{
          E(10,'IMAP Error',e2,rj);
        });

        imap.once('end',()=>{
          L('Connection ended');
          //rs('ok','em');
        });

        imap.connect();

      }catch(e0){
        E(205,'Error opening initiating Mailbox',e0,rj);
      }

    });
  }

  checkMail(imap){
    var H=this;
    return new Promise((rs,rj)=>{

      imap.search(
        [
          H.cfg.rules.flag,
          ['SINCE',H.cfg.rules.dateRange.since],
          ['BEFORE',H.cfg.rules.dateRange.till]
        ],
        (e4,searchResult)=>{

          if(e4){
            E(6,'Error searching messages',e4,rj,true);
          }

          H.stat.messagesFound=searchResult.length;

          rs(searchResult);

        }
      );

    });
  }

  receiveMail(operationDir,searchResultPortion,imap){
    var H=this;
    return new Promise((rs,rj)=>{

      //L(`Receiving mail ${Array.isArray(searchResultPortion)?searchResultPortion.join(','): ''}...`);
      L(`Receiving mail...`);

      let wtr=[
        new Promise((rst,rjt)=>{
          setTimeout(
            ()=>{
              rst(true);
            },
            1000
          );
        })
      ];

      let f=imap.fetch(
        searchResultPortion,
        {
          bodies:'',
          struct:true
        }
      );

      L(f);

      f.on('message',(msg,num)=>{

        L('Message #'+num);

        msg.on('body',(stream,info)=>{

          var buffer='';
          stream.on('data',chunk=>{
            buffer+=chunk.toString('utf8');
          });

          stream.once('end',()=>{

            wtr.push(H.processMessage(num,buffer,operationDir));

            //imap.end();
          });

        });

        msg.once('end',()=>{
          L('Finished fetching msg '+num);
        });

      });

      f.once('error',e3=>{
        return E(7,'Fetch error',e3,rj);
      });

      f.once('end',()=>{

        L('Done receiving all messages');
        //imap.end();

        Promise
          .all(wtr)
          .then(rw=>{
            
            L('closing imap');
            imap.end();

            L('Done processing fetched messages.\nSaving stat...');
            L(`wtr.length: ${wtr.length}`);
            L(`rw: ${rw}`);

            fs.writeJson(H.stat.operationDir+'/stt.json',H.stat,es=>{

              if(es){
                return E(8,'Fetch error',es,rj);
              }

              L('Stat saved','em');
              
              L('Closing the box...');
              imap.closeBox(ec=>{
               
                if(ec){
                  return E(10,'Close box error',ec,rj);
                }
               
              });
              
              rs('Done');

            });

          })
          .catch(ew=>{
            return E(9,'Fetch error',ew,rj);
          })
        ;

      });

    });
  }

  splitMessagesRangeAndFetch(operationDir,searchResult,imap){
    var H=this;
    return new Promise((rs,rj)=>{

      if(!operationDir){
        return E(207,'No folder to save attachments set');
      }

      if(searchResult.length===0){
        H.stat.messagesFound=0;
        L('0 new messages found');
        rs(0);
      }

      let wtr=[];

      let i=1;
      let l=Math.ceil(searchResult.length/H.cfg.pcs.portion);
      while(searchResult.length>0){

        L('Fetching portion: '+i+' of '+l);

        let portion=searchResult.splice(0,H.cfg.pcs.portion);

        L(`Extracted the portion: ${portion} of ${searchResult}`);

        wtr.push(H.receiveMail(operationDir,portion,imap));

        i++;

      }

      Promise
        .all(wtr)
        .then(rw=>{
          L('All Portions fetched successfully');
          rs(true);
        })
        .catch(ew=>{
          E(208,'Error fetching portion ',ew,rj);
        })
      ;

    });
  }

  run(cfgObj=null){

    var H=this;

    return new Promise((rsT,rjT)=>{

      L('Loading config...');

      H.loadConfig(cfgObj)
       .then(cfg=>{

         L('Successfully loaded config');
         //L(H.cfg);

         H.stat.operationDate=H.getCurrentDateTime();
         H.stat.sendersTotal =H.cfg.rules.from.list.length;

         let timeoutTrigger=new Promise((rs,rj)=>{
           setTimeout(
             ()=>{
               rj(new Error('Timeout '+H.cfg.pcs.totalTimeout+' exceeded'));
             },
             H.cfg.pcs.totalTimeout
           );
         });

         let mainFlow=new Promise((rs,rj)=>{

           L('Operation date: '+H.stat.operationDate);
           L('Cleaning caches...');

           //todo: implement clearPaths bool
           
           fs.emptyDir(path.resolve(this.getRtPth(H.cfg.local.path)),e5=>{

             if(e5){
               return E(11,'Error cleaning dirs',e5,rj);
             }

             L('Cleaning caches: ready');
             L('Creating tmp folders...');

             H.createFolders(H.stat.operationDate)
              .then(dirs=>{

                L('Tmp folder created: '+JSON.stringify(dirs));
                L('Initializing  MailBox...');

                H.initMailBox()
                 .then(imap=>{

                   L('MailBox initialized');
                   L('Checking mail...');

                   H.checkMail(imap)
                    .then(searchResult=>{

                      L(`Mail checked. Found ${searchResult.length} messages`);
                      L('Fetching mail...');

                      H.splitMessagesRangeAndFetch(H.stat.operationDir,searchResult,imap)
                       .then(rf=>{

                         L('Mail successfully fetched');
                         rs(rf);

                       })
                       .catch(e5=>{
                         E(16,'Error fetching mail',e5,rj);
                       })
                      ;

                    })
                    .catch(e4=>{
                      E(15,'Error checking mail',e4,rj);
                    })
                   ;

                 })
                 .catch(e3=>{
                   E(12,'Error initializing MailBox',e3,rj);
                 })
                ;

              })
              .catch(e2=>{
                E(13,'Error creating folders',e2,rj);
              })
             ;

           });

         });

         Promise.race([
           mainFlow,
           timeoutTrigger
         ])
          .then(rT=>{
            rsT(rT);
          })
          .catch(eT=>{
            E(20,'',eT,rjT);
          })
         ;

       });

    });

  }

}
