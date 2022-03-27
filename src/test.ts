import RQProxyProvider from "./rq-proxy-provider";
import { ProxyConfig } from "./types";


console.log("start");

const proxyConfig: ProxyConfig = {
    port: 8281,
    // @ts-ignore
    certPath: process.cwd()
}

// RQProxyProvider.getInstance().doSomething();
RQProxyProvider.createInstance(proxyConfig);
RQProxyProvider.getInstance().doSomething();

console.log("end");