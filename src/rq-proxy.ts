import IRulesDataSource from "./components/interfaces/rules-data-source";
import Proxy from "./lib/proxy";
import { ProxyConfig } from "./types";
import RulesHelper from "./utils/helpers/rules-helper";
import ProxyMiddlewareManager from "./components/proxy-middleware";
import ILoggerService from "./components/interfaces/logger-service";
import IInitialState from "./components/interfaces/state";
import GlobalStateProvider, {State} from "./components/proxy-middleware/middlewares/state";


class RQProxy {
    proxy: any;
    proxyMiddlewareManager!: ProxyMiddlewareManager;

    rulesHelper: RulesHelper;
    loggerService: ILoggerService;
    globalState: State;

    // RQ-2425: remembered so a toggle set before the middleware manager exists
    // (early in startup) isn't lost — it's replayed once the manager is created.
    private allowInsecureCerts?: boolean;

    constructor(
        proxyConfig: ProxyConfig, 
        rulesDataSource: IRulesDataSource, 
        loggerService: ILoggerService,
        initialGlobalState?: IInitialState
    ) {
        this.initProxy(proxyConfig);

        this.rulesHelper = new RulesHelper(rulesDataSource);
        this.loggerService = loggerService;
        this.globalState = GlobalStateProvider.initInstance(initialGlobalState?.sharedState ?? {}, initialGlobalState?.variables ?? {});
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
                    this.proxyMiddlewareManager = new ProxyMiddlewareManager(this.proxy, proxyConfig, this.rulesHelper, this.loggerService, null);
                    this.proxyMiddlewareManager.init();
                    // Replay a toggle that was set before the manager existed.
                    if (this.allowInsecureCerts !== undefined) {
                        this.proxyMiddlewareManager.setAllowInsecureCerts?.(this.allowInsecureCerts);
                    }
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

    // RQ-2425: live-update upstream TLS verification without restarting the proxy.
    // Remembers the value so it survives even if set before the middleware manager
    // is ready (replayed in initProxy once the manager is created).
    setAllowInsecureCerts = (value: boolean) => {
        this.allowInsecureCerts = !!value;
        this.proxyMiddlewareManager?.setAllowInsecureCerts?.(this.allowInsecureCerts);
    }

    doSomething = () => {
        console.log("do something");
    }
}

export default RQProxy;
