import axios from "axios";
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
                "creationDate": 1648800254537,
                "description": "",
                "groupId": "",
                "id": "Headers_br050",
                "isSample": false,
                "name": "Test Header Rule",
                "objectType": "rule",
                "pairs": [
                    {
                        "header": "abc",
                        "value": "abc value",
                        "type": "Add",
                        "target": "Request",
                        "source": {
                            "filters": {},
                            "key": "Url",
                            "operator": "Contains",
                            "value": "example"
                        },
                        "id": "lussg"
                    },
                    {
                        "header": "abc",
                        "value": "bac value",
                        "type": "Add",
                        "target": "Response",
                        "source": {
                            "filters": {},
                            "key": "Url",
                            "operator": "Contains",
                            "value": "example"
                        },
                        "id": "be1k6"
                    }
                ],
                "ruleType": "Headers",
                "status": "Active",
                "createdBy": "9cxfwgyBXKQxj9lU14GiTO5KTNY2",
                "currentOwner": "9cxfwgyBXKQxj9lU14GiTO5KTNY2",
                "lastModifiedBy": "9cxfwgyBXKQxj9lU14GiTO5KTNY2",
                "modificationDate": 1648800283699,
                "lastModified": 1648800283699
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
        console.log(JSON.stringify(log, null, 4));
        const headers = {
            "device_id": "test_device",
            "sdk_id": "7jcFc1g5j7ozfSXe7lc6",
        };
        // TODO: Keeping this as Strong for now to avoid changes in UI
        log.finalHar = JSON.stringify(log.finalHar);

        axios({
                method: "post",
                url : "http://localhost:5001/requestly-dev/us-central1/addSdkLog", // local
                headers,
                data: log
            }).then(() => {
                console.log("Successfully added log");
              }).catch(error => {
                console.log(`Could not add Log`);
              })
    };
}

// RQProxyProvider.getInstance().doSomething();
RQProxyProvider.createInstance(proxyConfig, new RulesDataSource(), new LoggerService());
RQProxyProvider.getInstance().doSomething();

console.log("end");