export function createRequestHarObject(requestHarObject: any, proxyToServerRequestOptions: any): {
    bodySize: number;
    headersSize: number;
    httpVersion: string;
    cookies: any[];
    headers: any;
    method: any;
    queryString: any;
    url: any;
    postData: any;
};
export function createHar(requestHeaders: any, method: any, protocol: any, host: any, path: any, requestBody: any, responseStatusCode: any, response: any, responseHeaders: any, requestParams: any): {
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
export function createHarEntry(requestHeaders: any, method: any, protocol: any, host: any, path: any, requestBody: any, responseStatusCode: any, response: any, responseHeaders: any, requestParams: any): {
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
};
export function createHarRequest(requestHeaders: any, method: any, protocol: any, host: any, path: any, requestBody: any, requestParams: any): {
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
export function createHarResponse(responseStatusCode: any, response: any, responseHeaders: any): {
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
