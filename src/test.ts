import ILoggerService from "./components/interfaces/logger-service";
import IRulesDataSource from "./components/interfaces/rules-data-source";
import RQProxyProvider from "./rq-proxy-provider";
import { ProxyConfig } from "./types";


console.log("start");

const proxyConfig: ProxyConfig = {
    port: 8281,
    // @ts-ignore
    certPath: "/Users/sahilgupta/Library/Application\\ Support/Electron/.requestly-certs-temp",
    // TODO: MOVE THIS IN RQ PROXY
    rootCertPath: "/Users/sahilgupta/Library/Application\\ Support/Electron/.requestly-certs-temp/certs/ca.pem"
}


class RulesDataSource implements IRulesDataSource {
    getRules = async (requestHeaders) => {
        return [
            {
                "creationDate": 1648450754463,
                "description": "",
                "groupId": "",
                "id": "Redirect_nkpon",
                "isSample": false,
                "name": "google to example.com",
                "objectType": "rule",
                "pairs": [
                    {
                        "destination": "http://example.com",
                        "source": {
                            "filters": {},
                            "key": "Url",
                            "operator": "Contains",
                            "value": "google"
                        },
                        "id": "88sua"
                    }
                ],
                "ruleType": "Redirect",
                "status": "Active",
                "createdBy": "9cxfwgyBXKQxj9lU14GiTO5KTNY2",
                "currentOwner": "9cxfwgyBXKQxj9lU14GiTO5KTNY2",
                "lastModifiedBy": "9cxfwgyBXKQxj9lU14GiTO5KTNY2",
                "modificationDate": 1648450784194,
                "lastModified": 1648450784194
            }
        ];
    }
    
    getGroups = async (requestHeaders) => {
        return [
            {
                id: "1",
                status: "Inactive"
            }
        ];
    }
}

class LoggerService implements ILoggerService {
    addLog = (log: any, requestHeaders: {}) => {
        console.log(log.url);
    };
}

// RQProxyProvider.getInstance().doSomething();
RQProxyProvider.createInstance(proxyConfig, new RulesDataSource(), new LoggerService());
RQProxyProvider.getInstance().doSomething();

console.log("end");