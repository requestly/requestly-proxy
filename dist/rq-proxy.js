"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = __importDefault(require("./lib/proxy"));
const rules_helper_1 = __importDefault(require("./utils/helpers/rules-helper"));
const proxy_middleware_1 = __importDefault(require("./components/proxy-middleware"));
const state_1 = __importDefault(require("./components/proxy-middleware/middlewares/state"));
class RQProxy {
    constructor(proxyConfig, rulesDataSource, loggerService, initialGlobalState) {
        var _a, _b;
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
                var _a, _b;
                console.log("Proxy Listen");
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("Proxy Started");
                    this.proxyMiddlewareManager = new proxy_middleware_1.default(this.proxy, proxyConfig, this.rulesHelper, this.loggerService, null);
                    this.proxyMiddlewareManager.init();
                    // Replay a toggle that was set before the manager existed.
                    if (this.allowInsecureCerts !== undefined) {
                        (_b = (_a = this.proxyMiddlewareManager).setAllowInsecureCerts) === null || _b === void 0 ? void 0 : _b.call(_a, this.allowInsecureCerts);
                    }
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
        // RQ-2425: live-update upstream TLS verification without restarting the proxy.
        // Remembers the value so it survives even if set before the middleware manager
        // is ready (replayed in initProxy once the manager is created).
        this.setAllowInsecureCerts = (value) => {
            var _a, _b;
            this.allowInsecureCerts = !!value;
            (_b = (_a = this.proxyMiddlewareManager) === null || _a === void 0 ? void 0 : _a.setAllowInsecureCerts) === null || _b === void 0 ? void 0 : _b.call(_a, this.allowInsecureCerts);
        };
        this.doSomething = () => {
            console.log("do something");
        };
        this.initProxy(proxyConfig);
        this.rulesHelper = new rules_helper_1.default(rulesDataSource);
        this.loggerService = loggerService;
        this.globalState = state_1.default.initInstance((_a = initialGlobalState === null || initialGlobalState === void 0 ? void 0 : initialGlobalState.sharedState) !== null && _a !== void 0 ? _a : {}, (_b = initialGlobalState === null || initialGlobalState === void 0 ? void 0 : initialGlobalState.variables) !== null && _b !== void 0 ? _b : {});
    }
}
exports.default = RQProxy;
