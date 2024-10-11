"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = require("../../../../lib/proxy");
const utils_1 = require("../utils");
const process_block_action = async (action, ctx) => {
    const allowed_handlers = [proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    return (0, utils_1.build_action_processor_response)(action, true, (0, utils_1.build_post_process_data)(418 /** Move this to temporarily out of coffee (503) if causes issues in someone production use case. // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418 */, { "Cache-Control": "no-cache" }, "Access to this URL has been blocked by Requestly"));
};
exports.default = process_block_action;
