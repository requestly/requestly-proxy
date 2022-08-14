"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = require("../../../../lib/proxy");
const requestly_core_1 = require("@requestly/requestly-core");
const proxy_ctx_helper_1 = require("../../helpers/proxy_ctx_helper");
const utils_1 = require("../utils");
const { types } = require("util");
const process_modify_request_action = (action, ctx) => {
    const allowed_handlers = [proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST_END];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    if (action.requestType &&
        action.requestType === requestly_core_1.CONSTANTS.REQUEST_BODY_TYPES.CODE) {
        modify_request_using_code(action, ctx);
        return (0, utils_1.build_action_processor_response)(action, true);
    }
    else {
        modify_request(ctx, action.request);
        return (0, utils_1.build_action_processor_response)(action, true);
    }
};
const modify_request = (ctx, new_req) => {
    if (new_req)
        ctx.rq_request_body = new_req;
};
const modify_request_using_code = (action, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let userFunction = null;
    try {
        userFunction = requestly_core_1.UTILS.GET_FUNCTION_FROM_STRING(action.request);
    }
    catch (error) {
        // User has provided an invalid function
        return modify_request(ctx, "Can't parse Requestly function. Please recheck. Error Code 7201. Actual Error: " +
            error.message);
    }
    if (!userFunction || typeof userFunction !== "function") {
        // User has provided an invalid function
        return modify_request(ctx, "Can't parse Requestly function. Please recheck. Error Code 944.");
    }
    // Everything good so far. Now try to execute user's function
    let finalRequest = null;
    try {
        const args = {
            method: ctx.clientToProxyRequest
                ? ctx.clientToProxyRequest.method
                    ? ctx.clientToProxyRequest.method
                    : null
                : null,
            request: ctx.rq_request_body,
            url: (0, proxy_ctx_helper_1.get_request_url)(ctx),
            requestHeaders: ctx.clientToProxyRequest.headers,
        };
        try {
            args.requestJSON = JSON.parse(args.request);
        }
        catch (_a) {
            /*Do nothing -- could not parse body as JSON */
        }
        finalRequest = userFunction(args);
        if (types.isPromise(finalRequest)) {
            finalRequest = yield finalRequest;
        }
        const isRequestJSON = !!args.requestJSON;
        if (typeof finalRequest === "object" && isRequestJSON) {
            finalRequest = JSON.stringify(finalRequest);
        }
        if (finalRequest && typeof finalRequest === "string") {
            return modify_request(ctx, finalRequest);
        }
        else
            throw new Error("Returned value is not a string");
    }
    catch (error) {
        // Function parsed but failed to execute
        return modify_request(ctx, "Can't execute Requestly function. Please recheck. Error Code 187. Actual Error: " +
            error.message);
    }
});
exports.default = process_modify_request_action;
