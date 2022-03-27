import RQProxy from "./rq-proxy";
import ILoggerService from "./components/interfaces/logger-service";
import IRulesDataSource from "./components/interfaces/rules-data-source";
import { ProxyConfig } from "./types";

class RQProxyProvider {
    static rqProxyInstance:any = null;

    // TODO: rulesDataSource can be static here
    static createInstance = (proxyConfig: ProxyConfig, rulesDataSource: IRulesDataSource, loggerService: ILoggerService) => {
        RQProxyProvider.rqProxyInstance = new RQProxy(proxyConfig, rulesDataSource, loggerService);
    }

    static getInstance = (): RQProxy => {
        if(!RQProxyProvider.rqProxyInstance) {
            console.error("Instance need to be created first");
        }
        
        return RQProxyProvider.rqProxyInstance;
    }
}

export default RQProxyProvider;
