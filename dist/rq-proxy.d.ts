import IRulesDataSource from "./components/interfaces/rules-data-source";
import { ProxyConfig } from "./types";
import RulesHelper from "./utils/helpers/rules-helper";
import ProxyMiddlewareManager from "./components/proxy-middleware";
import ILoggerService from "./components/interfaces/logger-service";
declare class RQProxy {
    proxy: any;
    proxyMiddlewareManager: ProxyMiddlewareManager;
    rulesHelper: RulesHelper;
    loggerService: ILoggerService;
    constructor(proxyConfig: ProxyConfig, rulesDataSource: IRulesDataSource, loggerService: ILoggerService);
    initProxy: (proxyConfig: ProxyConfig) => void;
    doSomething: () => void;
}
export default RQProxy;
