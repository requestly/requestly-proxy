"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = __importDefault(require("./lib/proxy"));
const rules_helper_1 = __importDefault(require("./utils/helpers/rules-helper"));
const proxy_middleware_1 = __importDefault(require("./components/proxy-middleware"));
class RQProxy {
    constructor(proxyConfig, rulesDataSource, loggerService) {
        this.initProxy = (proxyConfig) => {
            console.log("initProxy");
            console.log(proxyConfig);
            // @ts-ignore
            this.proxy = new proxy_1.default();
            if (proxyConfig.onCARegenerated) {
                this.proxy.onCARegenerated(proxyConfig.onCARegenerated);
            }
            // console.log(this.proxy);
            this.proxy.listen({
                port: proxyConfig.port,
                sslCaDir: proxyConfig.certPath,
                host: "0.0.0.0",
            }, (err) => {
                console.log("Proxy Listen");
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("Proxy Started");
                    this.proxyMiddlewareManager = new proxy_middleware_1.default(this.proxy, proxyConfig, this.rulesHelper, this.loggerService, null);
                    this.proxyMiddlewareManager.init();
                }
            });
            // For Testing //
            this.proxy.onRequest(function (ctx, callback) {
                if (ctx.clientToProxyRequest.headers.host == 'example.com') {
                    ctx.use(proxy_1.default.gunzip);
                    ctx.onResponseData(function (ctx, chunk, callback) {
                        chunk = new Buffer("<h1>Hello There</h1>");
                        return callback(null, chunk);
                    });
                }
                return callback();
            });
            //
        };
        this.doSomething = () => {
            console.log("do something");
        };
        this.initProxy(proxyConfig);
        this.rulesHelper = new rules_helper_1.default(rulesDataSource);
        this.loggerService = loggerService;
    }
}
exports.default = RQProxy;
