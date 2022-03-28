import RQProxy from ".";
import IRulesDataSource from "./components/interfaces/rules-data-source";
import { ProxyConfig } from "./types";

class RQProxyProvider {
    static rqProxyInstance:any = null;

    // TODO: rulesDataSource can be static here
    static createInstance = (proxyConfig: ProxyConfig, rulesDataSource: IRulesDataSource) => {
        RQProxyProvider.rqProxyInstance = new RQProxy(proxyConfig, rulesDataSource);
    }

    static getInstance = (): RQProxy => {
        if(!RQProxyProvider.rqProxyInstance) {
            console.error("Instance need to be created first");
        }
        
        return RQProxyProvider.rqProxyInstance;
    }
}

export default RQProxyProvider;
