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
const proxy_ctx_helper_1 = require("../../helpers/proxy_ctx_helper");
const modified_requests_pool_1 = __importDefault(require("../modified_requests_pool"));
const handle_mixed_response_1 = __importDefault(require("../handle_mixed_response"));
const utils_1 = require("../utils");
// adding util to get origin header for handling cors
const getRequestOrigin = (ctx) => {
    const originalRequestHeaders = ctx.rq.original_request.headers || {};
    return (originalRequestHeaders["Origin"] ||
        originalRequestHeaders["origin"] ||
        originalRequestHeaders["ORIGIN"]);
};
const process_redirect_action = (action, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const allowed_handlers = [proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    const current_url = (0, proxy_ctx_helper_1.get_request_url)(ctx);
    const new_url = action.url;
    const request_url = current_url.replace(/www\./g, "");
    // Skip if already redirected
    if (modified_requests_pool_1.default.isURLModified(request_url)) {
        // Do nothing
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    else {
        modified_requests_pool_1.default.add(new_url);
    }
    const { status: isMixedResponse, response_data } = yield (0, handle_mixed_response_1.default)(ctx, new_url);
    if (isMixedResponse) {
        return (0, utils_1.build_action_processor_response)(action, true, (0, utils_1.build_post_process_data)(response_data.status_code, response_data.headers, response_data.body));
    }
    // If this is a pre-flight request, don't redirect it
    if ((0, proxy_ctx_helper_1.is_request_preflight)(ctx))
        return true;
    return (0, utils_1.build_action_processor_response)(action, true, (0, utils_1.build_post_process_data)(307, {
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": getRequestOrigin(ctx) || "*",
        "Access-Control-Allow-Credentials": "true",
        Location: new_url,
    }, null));
});
exports.default = process_redirect_action;
