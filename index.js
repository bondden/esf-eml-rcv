/**
 * Created by Denis Bondarenko <bond.den@gmail.com> on 14.08.2015.
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EmlRcv = undefined;

var _esfBsc = require('esf-bsc');

var modBsc = _interopRequireWildcard(_esfBsc);

var _esfUtl = require('esf-utl');

var modUtl = _interopRequireWildcard(_esfUtl);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var Imap = require('imap'),
    iconv = require('iconv'),
    MailParser = require("mailparser").MailParser,
    inspect = require('util').inspect,
    path = require('path'),
    fs = require('fs-extra');

var Utl = modUtl.Utl,
    L = Utl.log,
    E = Utl.rejectingError;

class EmlRcv extends modBsc.Bsc {

  constructor() {
    super();
    this.stat = {
      operationDate: '',
      operationDir: '',
      messagesFound: 0,
      withAttachments: 0,
      filesReceived: 0,
      sendersTotal: 0,
      receivedFromSendersNum: 0,
      attachmentsReceived: 0,
      attachmentsSaved: 0,
      attLog: [],
      settings: {}
    };
  }

  getCurrentDateTime() {
    return Utl.getCurrentDateFmtFFS();
  }

  createFolders(folderName) {
    var H = this;
    return new Promise((rs, rj) => {

      let operationDir = path.resolve(__dirname + '/' + H.cfg.local.path + folderName);
      fs.ensureDir(operationDir, e => {

        if (e) {
          return E(1, 'Error creating dir ' + operationDir, e, rj);
        }

        H.stat.operationDir = operationDir;

        L(H.stat.operationDir);

        let wtr = [];
        for (let subDirId in H.cfg.local.subDirs) {
          if (!H.cfg.local.subDirs.hasOwnProperty(subDirId)) return;
          let subDirName = H.cfg.local.subDirs[subDirId];
          // for(let [subDirId,subDirName] of Object.entries(H.cfg.local.subDirs)){

          wtr.push(new Promise((rs1, rj1) => {

            let subDir = path.resolve(operationDir + '/' + subDirName);
            fs.ensureDir(subDir, e1 => {

              if (e1) {
                return E(2, 'Error creating dir ' + subDir, e1, rj1);
              }

              rs1(subDir);
            });
          }));
        }

        Promise.all(wtr).then(rw => {
          rs(rw.push(operationDir));
        }).catch(ew => {
          E(3, '', ew, rj);
        });
      });
    });
  }

  //todo: implement esf-eml-rcv-0.3
  processMessage(msgId, buffer, opDir) {
    var H = this;
    return new Promise((rs, rj) => {

      L(`Processing msg #${ msgId }...`);

      function detectAttachmentType(s) {
        let a = s.split('/');
        return Array.isArray(a) && a.length == 2 ? a[1] : '';
      }

      let file = path.resolve(opDir + '/' + H.cfg.local.subDirs.raw + msgId + '.eml');
      let psr = new MailParser();
      let wtr = [];

      psr.on("end", eml => {

        let attLogItem = {
          "msgId": msgId,
          "from": eml.from,
          "subj": eml.subject,
          "date": eml.date,
          "att": []
        };

        L('#' + msgId + ' attachments:', 'em');

        //fs.writeFileSync(path.resolve(opDir+'/e0/'+msgId+'.json'),JSON.stringify(eml,null,'\t'),{encoding:"utf8"});

        if (eml.attachments && eml.attachments.length) {

          H.stat.withAttachments++;

          eml.attachments.forEach((att, i, a) => {
            L('Msg ' + msgId + ' has attachment: ' + att.fileName);

            let fileData = {
              ext: path.extname(att.fileName),
              base: opDir + '/' + H.cfg.local.subDirs.att + msgId + '-' + i,
              type: detectAttachmentType(att.contentType),
              name: att.fileName,
              namGen: att.generatedFileName,
              tEncoding: att.transferEncoding,
              length: att.length,
              checksum: att.checksum
            };

            H.stat.attachmentsReceived++;

            let filePath = path.resolve(fileData.base + fileData.ext);

            if (H.cfg.rules.attachmentSubtypes.indexOf(fileData.type) === -1) return;

            wtr.push(new Promise((rsa, rja) => {

              L('Saving attachment ' + filePath);

              fs.writeFile(filePath, att.content, { encoding: "utf8" }, ea => {

                if (ea) {
                  return E(101, 'Error saving attachment ' + filePath, ea, rja);
                }

                attLogItem.att.push(fileData);
                H.stat.attachmentsSaved++;
                rsa(filePath);
              });
            }));
          });
        } else {
          wtr.push(new Promise((rsw, rjw) => {
            rsw(true);
          }));
        }

        Promise.all(wtr).then(rw => {

          H.stat.attLog.push(attLogItem);

          rs(msgId);
        }).catch(ew => {
          E(102, 'Error processing msg ' + msgId, ew, rj);
        });
      });

      fs.writeFile(file, buffer, { encoding: "utf8" }, ef => {

        if (ef) {
          return E(4, 'Error saving raw eml ' + file, ef, rj);
        }

        L(file + '\twritten');

        fs.createReadStream(file).pipe(psr);
      });
    });
  }

  initMailBox() {
    var H = this;
    return new Promise((rs, rj) => {

      try {

        //dbg:
        //L(H.cfg.imap);
        //return;

        var imap = new Imap(H.cfg.imap);

        //L('Imap:\n'+JSON.stringify(imap,null,'\t'));

        imap.once('ready', () => {
          imap.openBox('INBOX', true, (e1, box) => {

            if (e1) {
              return E(5, 'Error opening mail box', e1, rj);
            }

            //L('Inbox opened. box: '+JSON.stringify(box,null,'\t'));

            rs(imap);
          });
        });

        imap.once('error', e2 => {
          E(10, 'IMAP Error', e2, rj);
        });

        imap.once('end', () => {
          L('Connection ended');
          //rs('ok','em');
        });

        return imap.connect();
      } catch (e0) {
        E(205, 'Error opening initiating Mailbox', e0, rj);
      }
    });
  }

  checkMail(imap) {
    var H = this;
    return new Promise((rs, rj) => {

      imap.search(['UNSEEN', ['SINCE', H.cfg.rules.dateRange.since], ['BEFORE', H.cfg.rules.dateRange.till]], (e4, searchResult) => {

        if (e4) {
          E(6, 'Error searching messages', e4, rj, true);
        }

        H.stat.messagesFound = searchResult.length;

        rs(searchResult);
      });
    });
  }

  receiveMail(operationDir, searchResult, imap) {
    var H = this;
    return new Promise((rs, rj) => {

      let f = imap.seq.fetch(searchResult, {
        bodies: '',
        struct: true
      });

      let wtr = [new Promise((rst, rjt) => {
        setTimeout(() => rst(true), H.cfg.pcs.singleMailFetchTimeoutMs);
      })];

      f.on('message', (msg, num) => {

        L('Message #' + num);

        msg.on('body', (stream, info) => {

          var buffer = '';
          stream.on('data', chunk => {
            buffer += chunk.toString('utf8');
          });

          stream.once('end', () => {
            wtr.push(H.processMessage(num, buffer, operationDir));
            imap.end();
          });
        });

        msg.once('end', () => {
          L('Finished fetching msg ' + num);
        });
      });

      f.once('error', e3 => {
        E(7, 'Fetch error', e3);
      });

      f.once('end', () => {

        L('Done fetching all messages');
        imap.end();

        Promise.race(wtr).then(rw => {

          L('Done processing fetched messages.\nSaving stat...');

          fs.writeJson(H.stat.operationDir + '/stt.json', H.stat, es => {

            if (es) {
              return E(8, 'Fetch error', es, rj);
            }

            L('Stat saved', 'em');
            rs('Stat saved');
          });
        }).catch(ew => {
          E(9, 'Fetch error', ew, rj);
        });
      });
    });
  }

  splitMessagesRangeAndFetch(operationDir, searchResult, imap) {
    var H = this;
    return new Promise((rs, rj) => {

      if (!operationDir) {
        return E(207, 'No folder to save attachments set');
      }

      if (searchResult.length === 0) {
        H.stat.messagesFound = 0;
        L('0 new messages found');
        rs(0);
      }

      //let tmr=null;
      let wtr = [];

      let i = 1;
      let l = Math.ceil(searchResult.length / H.cfg.pcs.portion);
      while (searchResult.length > 0) {

        let portion = searchResult.splice(0, H.cfg.pcs.portion);
        L('Fetching portion: ' + i + ' of ' + l);
        wtr.push(H.receiveMail(operationDir, portion, imap));

        //tmr=setTimeout(function(){
        //	L('Fetching portion: '+portion);
        //	wtr.push(H.receiveMail(operationDir,portion));
        //},H.cfg.pcs.interPortionDelayMs);

        i++;
      }

      Promise.all(wtr).then(rw => {
        rs('All Portions fetched succssfully');
      }).catch(ew => {
        E(208, 'Error fetching portion ', ew, rj);
      });
    });
  }

  run(cfgObj = null) {

    var H = this;

    return new Promise((rsT, rjT) => {

      L('Loading config...');

      H.loadConfig(cfgObj).then(cfg => {

        L('Successfully loaded config');
        //L(H.cfg);

        H.stat.operationDate = H.getCurrentDateTime();
        H.stat.sendersTotal = H.cfg.rules.from.list.length;

        let timeoutTrigger = new Promise((rs, rj) => {
          setTimeout(() => {
            rj(new Error('Timeout ' + H.cfg.pcs.totalTimeout + ' exceeded'));
          }, H.cfg.pcs.totalTimeout);
        });

        let mainFlow = new Promise((rs, rj) => {

          L('Operation date: ' + H.stat.operationDate);
          L('Cleaning caches...');

          //todo: implement clearPaths bool
          fs.emptyDir(path.resolve(__dirname + '/' + H.cfg.local.path), e5 => {

            if (e5) {
              return E(11, 'Error cleaning dirs', e5, rj);
            }

            L('Cleaning caches: ready');
            L('Creating tmp folders...');

            H.createFolders(H.stat.operationDate).then(dirs => {

              L('Tmp folder created: ' + JSON.stringify(dirs));
              L('Initializing  MailBox...');

              H.initMailBox().then(imap => {

                L('MailBox initialized');
                L('Checking mail...');

                H.checkMail(imap).then(searchResult => {

                  L('Mail checked. Found ' + searchResult.length + ' messages');
                  L('Fetching mail...');

                  H.splitMessagesRangeAndFetch(H.stat.operationDir, searchResult, imap).then(rf => {

                    L('Mail successfully fetched');
                    rs(rf);
                  }).catch(e5 => {
                    E(16, 'Error fetching mail', e5, rj);
                  });
                }).catch(e4 => {
                  E(15, 'Error checking mail', e4, rj);
                });
              }).catch(e3 => {
                E(12, 'Error initializing MailBox', e3, rj);
              });
            }).catch(e2 => {
              E(13, 'Error creating folders', e2, rj);
            });
          });
        });

        Promise.race([mainFlow, timeoutTrigger]).then(rT => {
          rsT(rT);
        }).catch(eT => {
          E(20, '', eT, rjT);
        });
      });
    });
  }

}
exports.EmlRcv = EmlRcv;
//# sourceMappingURL=.maps/index.es7.js.map
