"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
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
        this.getRules = (requestHeaders) => __awaiter(this, void 0, void 0, function* () {
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
        });
        this.getGroups = (requestHeaders) => __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    id: "1",
                    status: "Inactive"
                }
            ];
        });
    }
}
class LoggerService {
    constructor() {
        this.addLog = (log, requestHeaders) => {
            console.log(JSON.stringify(log, null, 4));
            const headers = {
                "device_id": "test_device",
                "sdk_id": "7jcFc1g5j7ozfSXe7lc6",
            };
            // TODO: Keeping this as Strong for now to avoid changes in UI
            log.finalHar = JSON.stringify(log.finalHar);
            (0, axios_1.default)({
                method: "post",
                url: "http://localhost:5001/requestly-dev/us-central1/addSdkLog",
                headers,
                data: log
            }).then(() => {
                console.log("Successfully added log");
            }).catch(error => {
                console.log(`Could not add Log`);
            });
        };
    }
}
// RQProxyProvider.getInstance().doSomething();
rq_proxy_provider_1.default.createInstance(proxyConfig, new RulesDataSource(), new LoggerService());
rq_proxy_provider_1.default.getInstance().doSomething();
console.log("end");
