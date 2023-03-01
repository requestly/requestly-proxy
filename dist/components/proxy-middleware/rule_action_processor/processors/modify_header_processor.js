"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = require("../../../../lib/proxy");
const proxy_ctx_helper_1 = require("../../helpers/proxy_ctx_helper");
const utils_1 = require("../utils");
const process_modify_header_action = (action, ctx) => {
    const allowed_handlers = [
        proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST,
        proxy_1.PROXY_HANDLER_TYPE.ON_RESPONSE,
        proxy_1.PROXY_HANDLER_TYPE.ON_ERROR,
    ];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    if (ctx.currentHandler == proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST) {
        modify_request_headers(action, ctx);
    }
    else if (ctx.currentHandler === proxy_1.PROXY_HANDLER_TYPE.ON_RESPONSE || ctx.currentHandler === proxy_1.PROXY_HANDLER_TYPE.ON_ERROR) {
        modify_response_headers(action, ctx);
    }
    return (0, utils_1.build_action_processor_response)(action, true);
};
const modify_request_headers = (action, ctx) => {
    const newRequestHeaders = action.newHeaders;
    for (var headerName in ctx.proxyToServerRequestOptions.headers) {
        if (ctx.proxyToServerRequestOptions.headers.hasOwnProperty(headerName)) {
            delete ctx.proxyToServerRequestOptions.headers[headerName];
        }
    }
    // Set Request Headers
    newRequestHeaders.forEach((pair) => (ctx.proxyToServerRequestOptions.headers[pair.name] = pair.value));
};
const modify_response_headers = (action, ctx) => {
    ctx.serverToProxyResponse = ctx.serverToProxyResponse || {};
    ctx.serverToProxyResponse.headers = ctx.serverToProxyResponse.headers || {};
    // {"header1":"val1", "header2":"val2"}
    const originalResponseHeadersObject = ctx.serverToProxyResponse.headers;
    //  ["header1","header2"]
    const originalResponseHeadersObjectKeys = Object.keys(originalResponseHeadersObject);
    //  [{name:"header1", value:"val1"},{name:"header2", value:"val2"}]
    const originalResponseHeadersObjectKeysValuePairs = originalResponseHeadersObjectKeys.map((key) => {
        return {
            name: key,
            value: originalResponseHeadersObject[key],
        };
    });
    const requestURL = (0, proxy_ctx_helper_1.get_request_url)(ctx);
    const getRequestOrigin = () => {
        // array [{ name: header_name,value: header_val }] -> {headerName1:"value1",headerName2 :"value2"}
        const originalRequestHeadersConvertedObject = Object.assign({}, ...originalRequestHeaders.map((header) => ({
            [header.name]: header.value,
        })));
        if (originalRequestHeadersConvertedObject["Origin"])
            return originalRequestHeadersConvertedObject["Origin"];
        if (originalRequestHeadersConvertedObject["origin"])
            return originalRequestHeadersConvertedObject["origin"];
        if (originalRequestHeadersConvertedObject["ORIGIN"])
            return originalRequestHeadersConvertedObject["ORIGIN"];
        return "*";
    };
    const { newHeaders: newResponseHeaders } = action;
    // Set Response headers
    // Clear all existing Response headers (to handle "remove header" case)
    for (var headerName in ctx.serverToProxyResponse.headers) {
        if (ctx.serverToProxyResponse.headers.hasOwnProperty(headerName)) {
            delete ctx.serverToProxyResponse.headers[headerName];
        }
    }
    // Set new values
    newResponseHeaders.forEach((pair) => (ctx.serverToProxyResponse.headers[pair.name] = pair.value));
};
exports.default = process_modify_header_action;
