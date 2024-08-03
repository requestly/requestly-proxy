import IRulesDataSource from "./components/interfaces/rules-data-source";
import Proxy from "./lib/proxy";
import { ProxyConfig } from "./types";
import RulesHelper from "./utils/helpers/rules-helper";
import ProxyMiddlewareManager from "./components/proxy-middleware";
import ILoggerService from "./components/interfaces/logger-service";
import IInitialState from "./components/interfaces/state";
import State from "./components/proxy-middleware/middlewares/state";


class RQProxy {
    proxy: any;
    proxyMiddlewareManager!: ProxyMiddlewareManager;

    rulesHelper: RulesHelper;
    loggerService: ILoggerService;
    customGlobalState: State;

    constructor(
        proxyConfig: ProxyConfig, 
        rulesDataSource: IRulesDataSource, 
        loggerService: ILoggerService,
        initialCustomState?: IInitialState
    ) {
        this.initProxy(proxyConfig);

        this.rulesHelper = new RulesHelper(rulesDataSource);
        this.loggerService = loggerService;
        this.customGlobalState = new State(initialCustomState);
    }

    initProxy = (proxyConfig: ProxyConfig) => {
        console.log("initProxy");
        console.log(proxyConfig);
        // @ts-ignore
        this.proxy = new Proxy();
        if(proxyConfig.onCARegenerated) {
            this.proxy.onCARegenerated(proxyConfig.onCARegenerated)
        }
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
                    this.proxyMiddlewareManager = new ProxyMiddlewareManager(this.proxy, proxyConfig, this.rulesHelper, this.loggerService, null, this.customGlobalState);
                    this.proxyMiddlewareManager.init();
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
