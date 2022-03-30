"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rq_proxy_provider_1 = __importDefault(require("./rq-proxy-provider"));
console.log("start");
const proxyConfig = {
    port: 8281,
    // @ts-ignore
    certPath: "/Users/sahilgupta/Library/Application\\ Support/Electron/.requestly-certs-temp",
    // TODO: MOVE THIS IN RQ PROXY
    rootCertPath: "/Users/sahilgupta/Library/Application\\ Support/Electron/.requestly-certs-temp/certs/ca.pem"
};
class RulesDataSource {
    constructor() {
        this.getRules = (requestHeaders) => {
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
        };
        this.getGroups = (requestHeaders) => {
            return [
                {
                    id: "1",
                    status: "Inactive"
                }
            ];
        };
    }
}
class LoggerService {
    constructor() {
        this.addLog = (log, requestHeaders) => {
            console.log(log.url);
        };
    }
}
// RQProxyProvider.getInstance().doSomething();
rq_proxy_provider_1.default.createInstance(proxyConfig, new RulesDataSource(), new LoggerService());
rq_proxy_provider_1.default.getInstance().doSomething();
console.log("end");
