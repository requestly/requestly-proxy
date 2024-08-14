import RQProxy from "./rq-proxy";
import ILoggerService from "./components/interfaces/logger-service";
import IRulesDataSource from "./components/interfaces/rules-data-source";
import IInitialState from "./components/interfaces/state";
import { ProxyConfig } from "./types";
declare class RQProxyProvider {
    static rqProxyInstance: any;
    static createInstance: (proxyConfig: ProxyConfig, rulesDataSource: IRulesDataSource, loggerService: ILoggerService, initialGlobalState?: IInitialState) => void;
    static getInstance: () => RQProxy;
}
export default RQProxyProvider;
