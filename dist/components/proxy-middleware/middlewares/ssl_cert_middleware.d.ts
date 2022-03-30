export default SslCertMiddleware;
declare class SslCertMiddleware {
    constructor(is_active: any, rootCertPath: any);
    is_active: any;
    rootCertPath: any;
    on_request: (ctx: any) => Promise<boolean>;
}
