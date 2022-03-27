export default AmisuingMiddleware;
declare class AmisuingMiddleware {
    constructor(is_active: any);
    is_active: any;
    on_request: (ctx: any) => Promise<boolean>;
}
