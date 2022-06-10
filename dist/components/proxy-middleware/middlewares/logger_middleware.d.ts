export default LoggerMiddleware;
declare class LoggerMiddleware {
    constructor(is_active: any, loggerService: any);
    is_active: any;
    loggerService: any;
    generate_curl_from_har: (requestHarObject: any) => string;
    send_network_log: (ctx: any, action_result_objs?: any[], requestState?: string) => void;
    createLog: (ctx: any, action_result_objs?: any[], requestState?: string) => {
        id: any;
        timestamp: number;
        finalHar: {
            log: {
                version: string;
                creator: {};
                browser: {};
                pages: any[];
                entries: {
                    startedDateTime: string;
                    request: {
                        bodySize: number;
                        headersSize: number;
                        httpVersion: string;
                        cookies: any[];
                        headers: {
                            name: string;
                            value: any;
                        }[];
                        method: any;
                        queryString: any[];
                        url: string;
                        postData: {
                            mimeType: any;
                            text: any;
                        };
                    };
                    response: {
                        status: any;
                        httpVersion: string;
                        cookies: any[];
                        headers: {
                            name: string;
                            value: any;
                        }[];
                        content: {
                            size: number;
                            compression: number;
                            mimeType: any;
                            text: any;
                            comment: string;
                        };
                        headersSize: number;
                        bodySize: number;
                        comment: string;
                    };
                    cache: {};
                    timings: {};
                    comment: string;
                }[];
                comment: string;
            };
        };
        requestShellCurl: string;
        actions: any[];
        requestState: string;
    };
}
