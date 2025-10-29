"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = require("../../../../lib/proxy");
const utils_1 = require("../utils");
const resolveAfterDelay = async (durationInMs) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("resolved");
        }, durationInMs);
    });
};
const process_delay_action = async (action, ctx) => {
    const allowed_handlers = [proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    await resolveAfterDelay(action.delay);
    return (0, utils_1.build_action_processor_response)(action, true);
};
exports.default = process_delay_action;
