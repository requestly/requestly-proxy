"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rq_proxy_1 = __importDefault(require("./rq-proxy"));
class RQProxyProvider {
}
RQProxyProvider.rqProxyInstance = null;
// TODO: rulesDataSource can be static here
RQProxyProvider.createInstance = (proxyConfig, rulesDataSource, loggerService, initialGlobalState) => {
    RQProxyProvider.rqProxyInstance = new rq_proxy_1.default(proxyConfig, rulesDataSource, loggerService, initialGlobalState);
};
RQProxyProvider.getInstance = () => {
    if (!RQProxyProvider.rqProxyInstance) {
        console.error("Instance need to be created first");
    }
    return RQProxyProvider.rqProxyInstance;
};
exports.default = RQProxyProvider;
