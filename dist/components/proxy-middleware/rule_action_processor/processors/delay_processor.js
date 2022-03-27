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
const utils_1 = require("../utils");
const resolveAfterDelay = (durationInMs) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("resolved");
        }, durationInMs);
    });
});
const process_delay_action = (action, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const allowed_handlers = [proxy_1.PROXY_HANDLER_TYPE.ON_REQUEST];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    yield resolveAfterDelay(action.delay);
    return (0, utils_1.build_action_processor_response)(action, true);
});
exports.default = process_delay_action;
