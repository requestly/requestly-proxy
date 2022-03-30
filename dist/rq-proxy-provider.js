"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = __importDefault(require("."));
class RQProxyProvider {
}
RQProxyProvider.rqProxyInstance = null;
// TODO: rulesDataSource can be static here
RQProxyProvider.createInstance = (proxyConfig, rulesDataSource, loggerService) => {
    RQProxyProvider.rqProxyInstance = new _1.default(proxyConfig, rulesDataSource, loggerService);
};
RQProxyProvider.getInstance = () => {
    if (!RQProxyProvider.rqProxyInstance) {
        console.error("Instance need to be created first");
    }
    return RQProxyProvider.rqProxyInstance;
};
exports.default = RQProxyProvider;
