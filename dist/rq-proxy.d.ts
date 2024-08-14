import IRulesDataSource from "./components/interfaces/rules-data-source";
import { ProxyConfig } from "./types";
import RulesHelper from "./utils/helpers/rules-helper";
import ProxyMiddlewareManager from "./components/proxy-middleware";
import ILoggerService from "./components/interfaces/logger-service";
import IInitialState from "./components/interfaces/state";
import { State } from "./components/proxy-middleware/middlewares/state";
declare class RQProxy {
    proxy: any;
    proxyMiddlewareManager: ProxyMiddlewareManager;
    rulesHelper: RulesHelper;
    loggerService: ILoggerService;
    globalState: State;
    constructor(proxyConfig: ProxyConfig, rulesDataSource: IRulesDataSource, loggerService: ILoggerService, initialGlobalState?: IInitialState);
    initProxy: (proxyConfig: ProxyConfig) => void;
    doSomething: () => void;
}
export default RQProxy;
