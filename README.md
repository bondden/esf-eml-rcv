# ESF E-mail Receiver
Promised-based wrapper over [imap](https://www.npmjs.com/package/imap), configured via esfcfg.json or in-memory config Object.

## Example
```js
const 
  App   =require('../index.js').EmlRcv,
  cfgObj={
    schemaVersion:'0.5.0',
    pcs:          {
      totalTimeout: 7200000,
      portion:      100000
    },
    imap:         {
      user:    '{USER_LOGIN}',
      password:'{USER_PASSWORD}',
      host:    '{IMAP_HOST}',
      port:    IMAP_PORT,
      tls:     true
    },
    rules:        {
      flag:'UNSEEN',
      from:                {
        addr:       'all',
        regex:      '',
        list:       []
      },
      dateRange:           {
        since:'2015-06-30 00:00:00',
        till: '2017-07-01 23:59:59'
      },
      attachmentTypes:     [
        'application'
      ],
      attachmentSubtypes:  [
        'x-excel'
      ],
      attachmentExtensions:[
        'xls'
      ]
    },
    local:        {
      clearPaths:false,
      path:      'tst/d/eml/rcv/',
      subDirs:   {
        raw:'raw/',
        att:'att/',
        unm:'unm/'
      }
    }
  }
  ;

app
  .run(cfgObj)
  .then(r=>{
    done();
  })
  .catch(e=>{
    done(e);
  })
;

```

## Road map

Version | Functionality                                                                                                | Status   | Implemented Methods
------- | ------------------------------------------------------------------------------------------------------------ | -------- | -------------------
0.1.0   | Check mail and save attachments (req: [esf-eml-rcv-1.1](esf-eml-rcv-1.1), [esf-eml-rcv-1.2](esf-eml-rcv-1.2) | released | ```receiveMail```
0.2.0   | Fetch by portions (req. [esf-eml-rcv-1.3](esf-eml-rcv-1.3))                                                  |          | ```checkMail```
1.0.0   | API v.1.0 [esf-eml-rcv-1.0](esf-eml-rcv-1.0)                                                                 |          | ```reloadConfig```
1.1.0   | API v.1.1 [esf-eml-rcv-1.0](esf-eml-rcv-1.0)                                                                 |          | ```reloadConfig```

## Requirements
### esf-eml-rcv-1

ReqId           | Requirement
--------------- | -------------------------------------------------------------------------
esf-eml-rcv-0.1 | It should have configurable time intervals for mails
esf-eml-rcv-0.2 | It should save attachments from mails, according set  of mime-types
esf-eml-rcv-0.3 | It should save other attachments according extension into separate folder
esf-eml-rcv-0.4 | It should fetch mail by portions, sized in config
esf-eml-rcv-1.0 | It should implement API 1.0
esf-eml-rcv-1.1 | It should have an option to copy saved files to persistent place
esf-eml-rcv-1.2 | It should run the complete activity flow with a single method

## API 

### v.1.1

```js
class EmlRcv extends Bsc {
  Promise run([string pathToConfigFile|object configObject])          // runs complete activity flow
  Promise reloadConfig([string pathToConfigFile|object configObject]) //inherited
  Promise getCurrentDateTime()
  Promise createFolders(string folderName)
  Promise processMessage(integer msgId, Buffer buffer, string opDir)
  Promise initMailBox()
  Promise checkMail(imap)
  Promise receiveMail(operationDir,searchResultPortion,imap)
  Promise splitMessagesRangeAndFetch(operationDir,searchResult,imap)
}
```

### API v.1.0

```js
class EmlRcv extends Bsc {
  Promise reloadConfig([string pathToConfigFile]) //inherited
  Promise checkMail()
  Promise receiveMail(string operationDir)
}
```

--------------------------------------------------------------------------------

© MIT bondden 2009-2016
