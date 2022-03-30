"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = require("../../../../lib/proxy");
const utils_1 = require("../utils");
const process_modify_user_agent_action = (action, ctx) => {
    const allowed_handlers = [proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    if (ctx.currentHandler == proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST) {
        modify_request_headers(action, ctx);
        return (0, utils_1.build_action_processor_response)(action, true);
    }
};
const modify_request_headers = (action, ctx) => {
    const newRequestHeaders = action.newRequestHeaders;
    for (var headerName in ctx.proxyToServerRequestOptions.headers) {
        if (ctx.proxyToServerRequestOptions.headers.hasOwnProperty(headerName)) {
            delete ctx.proxyToServerRequestOptions.headers[headerName];
        }
    }
    // Set Request Headers
    newRequestHeaders.forEach((pair) => (ctx.proxyToServerRequestOptions.headers[pair.name] = pair.value));
};
exports.default = process_modify_user_agent_action;
