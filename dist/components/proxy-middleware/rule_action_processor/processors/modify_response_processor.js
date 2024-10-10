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
const http_helpers_1 = require("../../helpers/http_helpers");
const utils_2 = require("../../../../utils");
const constants_1 = require("../../constants");
const process_modify_response_action = (action, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const allowed_handlers = [proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST, proxy_1.PROXY_HANDLER_TYPE.ON_RESPONSE_END, proxy_1.PROXY_HANDLER_TYPE.ON_ERROR];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    if (ctx.currentHandler === proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST) {
        if (action.responseType === requestly_core_1.CONSTANTS.RESPONSE_BODY_TYPES.STATIC
            && action.serveWithoutRequest) {
            let contentType, finalBody;
            try {
                finalBody = JSON.parse(action.response);
                contentType = "application/json";
            }
            catch (_a) {
                contentType = "text/plain";
                finalBody = action.response;
            }
            const status = action.statusCode || 200;
            const finalHeaders = { "Content-Type": contentType };
            modify_response(ctx, finalBody, status);
            return (0, utils_1.build_action_processor_response)(action, true, (0, utils_1.build_post_process_data)(status, finalHeaders, finalBody));
        }
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    if (action.responseType &&
        action.responseType === requestly_core_1.CONSTANTS.RESPONSE_BODY_TYPES.CODE) {
        const contentTypeHeader = (0, proxy_ctx_helper_1.getResponseContentTypeHeader)(ctx);
        const contentType = (0, http_helpers_1.getContentType)(contentTypeHeader);
        if (constants_1.RQ_INTERCEPTED_CONTENT_TYPES.includes(contentType) || contentType == null) {
            yield modify_response_using_code(action, ctx);
            delete_breaking_headers(ctx);
            return (0, utils_1.build_action_processor_response)(action, true);
        }
        // Sentry not working
        // Sentry.captureException(new Error(`Content Type ${contentType} not supported for modification in programmatic mode`));
        console.log(`Content Type ${contentType} not supported for modification in programmatic mode`);
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    else if (action.responseType === requestly_core_1.CONSTANTS.RESPONSE_BODY_TYPES.LOCAL_FILE) {
        modify_response_using_local(action, ctx);
        delete_breaking_headers(ctx);
        return (0, utils_1.build_action_processor_response)(action, true);
    }
    else {
        modify_response(ctx, action.response, action.statusCode);
        delete_breaking_headers(ctx);
        return (0, utils_1.build_action_processor_response)(action, true);
    }
});
const delete_breaking_headers = (ctx) => {
    delete (0, proxy_ctx_helper_1.getResponseHeaders)(ctx)['content-length'];
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
        console.log("Error reading file", err);
    }
};
const modify_response_using_code = (action, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e;
    let userFunction = null;
    try {
        userFunction = (0, utils_2.getFunctionFromString)(action.response);
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
            response: ctx === null || ctx === void 0 ? void 0 : ctx.rq_parsed_response_body,
            url: (0, proxy_ctx_helper_1.get_request_url)(ctx),
            responseType: (_c = (_b = ctx === null || ctx === void 0 ? void 0 : ctx.serverToProxyResponse) === null || _b === void 0 ? void 0 : _b.headers) === null || _c === void 0 ? void 0 : _c["content-type"],
            requestHeaders: ctx.clientToProxyRequest.headers,
            requestData: (0, http_helpers_1.parseJsonBody)((_e = (_d = ctx.rq) === null || _d === void 0 ? void 0 : _d.final_request) === null || _e === void 0 ? void 0 : _e.body) || null,
            statusCode: ctx.serverToProxyResponse.statusCode,
        };
        try {
            args.responseJSON = JSON.parse(args.response);
        }
        catch (_f) {
            /*Do nothing -- could not parse body as JSON */
        }
        finalResponse = yield (0, utils_2.executeUserFunction)(ctx, action.response, args);
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
