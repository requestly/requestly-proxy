export default LoggerMiddleware;
declare class LoggerMiddleware {
    constructor(is_active: any, loggerService: any);
    is_active: any;
    loggerService: any;
    generate_curl_from_har: (requestHarObject: any) => string;
    send_network_log_v2: (ctx: any, action_result_objs?: any[]) => void;
}
