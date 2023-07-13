/**
 *
 * @param queryString e.g. ?a=1&b=2 or a=1 or ''
 * @returns object { paramName -> [value1, value2] }
 */
export function getQueryParamsMap(queryString: any): {};
export function get_request_url(ctx: any): string;
export function get_original_request_headers(ctx: any): any;
export function get_original_response_headers(ctx: any): any;
export function is_request_preflight(ctx: any): boolean;
export function get_response_options(ctx: any): {
    status_code: any;
    headers: any;
};
export function get_request_options(ctx: any): any;
export function get_json_query_params(ctx: any): {};
export function getRequestHeaders(ctx: any): any;
export function getRequestContentTypeHeader(ctx: any): any;
export function getResponseHeaders(ctx: any): any;
export function getResponseContentTypeHeader(ctx: any): any;
export function getResponseStatusCode(ctx: any): any;
