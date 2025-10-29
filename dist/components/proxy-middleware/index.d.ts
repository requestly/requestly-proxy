export namespace MIDDLEWARE_TYPE {
    let AMIUSING: string;
    let RULES: string;
    let LOGGER: string;
    let SSL_CERT: string;
    let GLOBAL_STATE: string;
}
export default ProxyMiddlewareManager;
declare class ProxyMiddlewareManager {
    constructor(proxy: any, proxyConfig: any, rulesHelper: any, loggerService: any, sslConfigFetcher: any);
    config: {};
    proxy: any;
    proxyConfig: any;
    rulesHelper: any;
    loggerService: any;
    sslConfigFetcher: any;
    init_config: (config?: {}) => void;
    init: (config?: {}) => void;
    request_handler_idx: number;
    init_request_handler: (fn: any, is_detachable?: boolean) => number;
    init_amiusing_handler: () => void;
    init_ssl_cert_handler: () => void;
    init_main_handler: () => void;
    init_ssl_tunneling_handler: () => void;
    init_handlers: () => void;
}
