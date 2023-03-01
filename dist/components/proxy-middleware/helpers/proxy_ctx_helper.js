"use strict";
// TODO: Removing this for now
// import {
//   extractUrlComponent,
//   getQueryParamsMap,
// } from "../../../../../../../common/components/utils/utils";
// const CONSTANTS = require("../../../../../../../common/constants");
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResponseStatusCode = exports.getResponseContentTypeHeader = exports.getResponseHeaders = exports.getRequestContentTypeHeader = exports.getRequestHeaders = exports.get_request_options = exports.get_response_options = exports.is_request_preflight = exports.get_original_response_headers = exports.get_original_request_headers = exports.get_request_url = void 0;
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
    return Object.assign({}, ctx.proxyToServerRequestOptions);
};
exports.get_request_options = get_request_options;
// export const get_json_query_params = (ctx) => {
//   const url = get_request_url(ctx);
//   let queryString = extractUrlComponent(url, CONSTANTS.URL_COMPONENTS.QUERY);
//   return getQueryParamsMap(queryString) || null;
// };
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
