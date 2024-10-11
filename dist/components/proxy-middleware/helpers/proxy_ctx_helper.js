"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResponseStatusCode = exports.getResponseContentTypeHeader = exports.getResponseHeaders = exports.getRequestContentTypeHeader = exports.getRequestHeaders = exports.get_json_query_params = exports.get_request_options = exports.get_response_options = exports.is_request_preflight = exports.get_original_response_headers = exports.get_original_request_headers = exports.get_request_url = void 0;
exports.getQueryParamsMap = getQueryParamsMap;
const requestly_core_1 = require("@requestly/requestly-core");
function extractUrlComponent(url, name) {
    const myUrl = new URL(url);
    switch (name) {
        case requestly_core_1.CONSTANTS.URL_COMPONENTS.URL:
            return url;
        case requestly_core_1.CONSTANTS.URL_COMPONENTS.PROTOCOL:
            return myUrl.protocol;
        case requestly_core_1.CONSTANTS.URL_COMPONENTS.HOST:
            return myUrl.host;
        case requestly_core_1.CONSTANTS.URL_COMPONENTS.PATH:
            return myUrl.pathname;
        case requestly_core_1.CONSTANTS.URL_COMPONENTS.QUERY:
            return myUrl.search;
        case requestly_core_1.CONSTANTS.URL_COMPONENTS.HASH:
            return myUrl.hash;
    }
    console.error("Invalid source key", url, name);
}
/**
 *
 * @param queryString e.g. ?a=1&b=2 or a=1 or ''
 * @returns object { paramName -> [value1, value2] }
 */
function getQueryParamsMap(queryString) {
    var map = {}, queryParams;
    if (!queryString || queryString === "?") {
        return map;
    }
    if (queryString[0] === "?") {
        queryString = queryString.substr(1);
    }
    queryParams = queryString.split("&");
    queryParams.forEach(function (queryParam) {
        var paramName = queryParam.split("=")[0], paramValue = queryParam.split("=")[1];
        // We are keeping value of param as array so that in future we can support multiple param values of same name
        // And we do not want to lose the params if url already contains multiple params of same name
        map[paramName] = map[paramName] || [];
        map[paramName].push(paramValue);
    });
    return map;
}
const get_request_url = (ctx) => {
    return ((ctx.isSSL ? "https://" : "http://") +
        ctx.clientToProxyRequest.headers.host +
        ctx.clientToProxyRequest.url);
};
exports.get_request_url = get_request_url;
const get_original_request_headers = (ctx) => {
    // TODO: This needs to be fetched from ctx.clientToProxy headers
    return ctx.proxyToServerRequestOptions.headers;
};
exports.get_original_request_headers = get_original_request_headers;
const get_original_response_headers = (ctx) => {
    var _a;
    // TODO: This needs to be fetched from ctx.clientToProxy headers
    return ((_a = ctx === null || ctx === void 0 ? void 0 : ctx.serverToProxyResponse) === null || _a === void 0 ? void 0 : _a.headers) || {};
};
exports.get_original_response_headers = get_original_response_headers;
const is_request_preflight = (ctx) => {
    if (
    // Request method is OPTIONS
    ctx.clientToProxyRequest.method.toLowerCase() === "options" &&
        // Has "origin" or "Origin" or "ORIGIN" header
        (ctx.clientToProxyRequest.headers["Origin"] ||
            ctx.clientToProxyRequest.headers["origin"] ||
            ctx.clientToProxyRequest.headers["ORIGIN"]) &&
        // Has Access-Control-Request-Method header
        (ctx.clientToProxyRequest.headers["Access-Control-Request-Method"] ||
            ctx.clientToProxyRequest.headers["access-control-request-method"] ||
            ctx.clientToProxyRequest.headers["ACCESS-CONTROL-REQUEST-METHOD"]))
        return true;
    else
        return false;
};
exports.is_request_preflight = is_request_preflight;
const get_response_options = (ctx) => {
    const options = {};
    options.status_code = ctx.serverToProxyResponse.statusCode;
    options.headers = ctx.serverToProxyResponse.headers;
    return options;
};
exports.get_response_options = get_response_options;
const get_request_options = (ctx) => {
    return {
        ...ctx.proxyToServerRequestOptions,
        query_params: (0, exports.get_json_query_params)(ctx),
    };
};
exports.get_request_options = get_request_options;
const get_json_query_params = (ctx) => {
    const url = (0, exports.get_request_url)(ctx);
    let queryString = extractUrlComponent(url, requestly_core_1.CONSTANTS.URL_COMPONENTS.QUERY);
    return getQueryParamsMap(queryString) || null;
};
exports.get_json_query_params = get_json_query_params;
const getRequestHeaders = (ctx) => {
    if (ctx && ctx.proxyToServerRequestOptions) {
        return ctx.proxyToServerRequestOptions.headers || {};
    }
    return {};
};
exports.getRequestHeaders = getRequestHeaders;
const getRequestContentTypeHeader = (ctx) => {
    return (0, exports.getRequestHeaders)(ctx)["content-type"];
};
exports.getRequestContentTypeHeader = getRequestContentTypeHeader;
const getResponseHeaders = (ctx) => {
    if (ctx && ctx.serverToProxyResponse) {
        return ctx.serverToProxyResponse.headers || {};
    }
    return {};
};
exports.getResponseHeaders = getResponseHeaders;
const getResponseContentTypeHeader = (ctx) => {
    return (0, exports.getResponseHeaders)(ctx)["content-type"];
};
exports.getResponseContentTypeHeader = getResponseContentTypeHeader;
const getResponseStatusCode = (ctx) => {
    if (ctx && ctx.serverToProxyResponse) {
        return ctx.serverToProxyResponse.statusCode;
    }
};
exports.getResponseStatusCode = getResponseStatusCode;
