import RQProxy from "./rq-proxy";
import ILoggerService from "./components/interfaces/logger-service";
import IRulesDataSource from "./components/interfaces/rules-data-source";
import { ProxyConfig } from "./types";
declare class RQProxyProvider {
    static rqProxyInstance: any;
    static createInstance: (proxyConfig: ProxyConfig, rulesDataSource: IRulesDataSource, loggerService: ILoggerService) => void;
    static getInstance: () => RQProxy;
}
export default RQProxyProvider;
