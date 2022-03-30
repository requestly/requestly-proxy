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
