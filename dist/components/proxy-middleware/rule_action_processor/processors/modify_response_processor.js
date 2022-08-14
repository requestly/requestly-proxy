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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = require("../../../../lib/proxy");
const requestly_core_1 = require("@requestly/requestly-core");
const proxy_ctx_helper_1 = require("../../helpers/proxy_ctx_helper");
const utils_1 = require("../utils");
const fs_1 = __importDefault(require("fs"));
const { types } = require("util");
const process_modify_response_action = (action, ctx) => {
    const allowed_handlers = [proxy_1.PROXY_HANDLER_TYPE.ON_RESPONSE_END];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    if (action.responseType &&
        action.responseType === requestly_core_1.CONSTANTS.RESPONSE_BODY_TYPES.CODE) {
        modify_response_using_code(action, ctx);
        return (0, utils_1.build_action_processor_response)(action, true);
    }
    else if (action.responseType === requestly_core_1.CONSTANTS.RESPONSE_BODY_TYPES.LOCAL_FILE) {
        modify_response_using_local(action, ctx);
        return (0, utils_1.build_action_processor_response)(action, true);
    }
    else {
        modify_response(ctx, action.response, action.statusCode);
        return (0, utils_1.build_action_processor_response)(action, true);
    }
};
const modify_response = (ctx, new_resp, status_code) => {
    ctx.rq_response_body = new_resp;
    ctx.rq_response_status_code = status_code;
};
const modify_response_using_local = (action, ctx) => {
    let data;
    try {
        data = fs_1.default.readFileSync(action.response, "utf-8");
        modify_response(ctx, data, action.statusCode);
    }
    catch (err) {
        console.log("Some Error while reading file");
    }
};
const modify_response_using_code = (action, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let userFunction = null;
    try {
        userFunction = requestly_core_1.UTILS.GET_FUNCTION_FROM_STRING(action.response);
    }
    catch (error) {
        // User has provided an invalid function
        return modify_response(ctx, "Can't parse Requestly function. Please recheck. Error Code 7201. Actual Error: " +
            error.message);
    }
    if (!userFunction || typeof userFunction !== "function") {
        // User has provided an invalid function
        return modify_response(ctx, "Can't parse Requestly function. Please recheck. Error Code 944.");
    }
    // Everything good so far. Now try to execute user's function
    let finalResponse = null;
    try {
        const args = {
            method: ctx.clientToProxyRequest
                ? ctx.clientToProxyRequest.method
                    ? ctx.clientToProxyRequest.method
                    : null
                : null,
            response: ctx.rq_response_body,
            url: (0, proxy_ctx_helper_1.get_request_url)(ctx),
            responseType: ctx.serverToProxyResponse.headers["content-type"],
            requestHeaders: ctx.clientToProxyRequest.headers,
            requestData: null,
        };
        try {
            args.responseJSON = JSON.parse(args.response);
        }
        catch (_a) {
            /*Do nothing -- could not parse body as JSON */
        }
        finalResponse = userFunction(args);
        if (types.isPromise(finalResponse)) {
            finalResponse = yield finalResponse;
        }
        const isResponseJSON = args.responseType && args.responseType.includes("application/json");
        if (typeof finalResponse === "object" && isResponseJSON) {
            finalResponse = JSON.stringify(finalResponse);
        }
        if (finalResponse && typeof finalResponse === "string") {
            return modify_response(ctx, finalResponse, action.statusCode);
        }
        else
            throw new Error("Returned value is not a string");
    }
    catch (error) {
        // Function parsed but failed to execute
        return modify_response(ctx, "Can't execute Requestly function. Please recheck. Error Code 187. Actual Error: " +
            error.message);
    }
});
exports.default = process_modify_response_action;
