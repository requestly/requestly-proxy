import RQProxy from ".";
import { ProxyConfig } from "./types";

class RQProxyProvider {
    static rqProxyInstance:any = null;

    static createInstance = (proxyConfig: ProxyConfig) => {
        RQProxyProvider.rqProxyInstance = new RQProxy(proxyConfig);
    }

    static getInstance = (): RQProxy => {
        if(!RQProxyProvider.rqProxyInstance) {
            console.error("Instance need to be created first");
        }
        
        return RQProxyProvider.rqProxyInstance;
    }
}

export default RQProxyProvider;
