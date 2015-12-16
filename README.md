# ESF E-mail Receiver

## Road map

| Version   | Functionality                                                                                                | Status   | Implemented Methods |
|---        |---                                                                                                           |---       |---                  |
| 0.1.0     | Check mail and save attachments (req: [esf-eml-rcv-1.1](esf-eml-rcv-1.1), [esf-eml-rcv-1.2](esf-eml-rcv-1.2) | released | ```receiveMail```   |
| 0.2.0     | Fetch by portions (req. [esf-eml-rcv-1.3](esf-eml-rcv-1.3))                                                  |          | ```checkMail```     |
| 1.0.0     | API v.1.0 [esf-eml-rcv-1.0](esf-eml-rcv-1.0)                                                                 |          | ```reloadConfig```  |

## Requirements

### esf-eml-rcv-1
| ReqId           | Requirement                                                                |
|---              |---                                                                         |
| esf-eml-rcv-0.1 | It should have configurable time intervals for mails                       |
| esf-eml-rcv-0.2 | It should save attachments from mails, according set  of mime-types        |
| esf-eml-rcv-0.3 | It should save other attachments according extension into separate folder  |
| esf-eml-rcv-0.4 | It should fetch mail by portions, sized in config                          |
| esf-eml-rcv-1.0 | It should implement API 1.0                                                |
| esf-eml-rcv-1.1 | It should have an option to copy saved files to persistent place           |

## API v.1.0

```cs
class EmlRcv extends Bsc {
  Promise reloadConfig([String pathToConfigFile]) //inherited
  Promise checkMail()
  Promise receiveMail(String operationDir)
}
```
