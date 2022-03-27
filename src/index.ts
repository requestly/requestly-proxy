import Proxy from "./lib/proxy";
import { ProxyConfig } from "./types";


class RQProxy {
    proxy: any;
    proxyMiddlewareManager: any;

    constructor(proxyConfig: ProxyConfig) {
        console.log("Hello");
        this.initProxy(proxyConfig);
    }

    initProxy = (proxyConfig: ProxyConfig) => {
        console.log("initProxy");
        console.log(proxyConfig);
        // @ts-ignore
        this.proxy = new Proxy();
        // console.log(this.proxy);
        this.proxy.listen(
            {
              port: proxyConfig.port,
              sslCaDir: proxyConfig.certPath,
              host: "0.0.0.0",
            },
            (err: any) => {
                console.log("Proxy Listen");
                if(err) {
                    console.log(err);
                } else {
                    console.log("Proxy Started");
                    // this.proxyMiddlewareManager = new ProxyMiddlewareManager();
                    // await proxy_middleware.init({ [MIDDLEWARE_TYPE.LOGGER]: false });
                }
            }
        );
          

        // For Testing //
        this.proxy.onRequest(function(ctx, callback) {
            if (ctx.clientToProxyRequest.headers.host == 'example.com') {
                ctx.use(Proxy.gunzip);
                ctx.onResponseData(function(ctx, chunk, callback) {
                    chunk = new Buffer("<h1>Hello There</h1>");
                    return callback(null, chunk);
                });
            }
            return callback();
        });
        //
    }

    doSomething = () => {
        console.log("do something");
    }
}

export default RQProxy;
