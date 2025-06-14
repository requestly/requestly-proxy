"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const redirect_processor_1 = __importDefault(require("./processors/redirect_processor"));
const modify_header_processor_1 = __importDefault(require("./processors/modify_header_processor"));
const modify_user_agent_processor_1 = __importDefault(require("./processors/modify_user_agent_processor"));
const delay_processor_1 = __importDefault(require("./processors/delay_processor"));
const block_processor_1 = __importDefault(require("./processors/block_processor"));
const modify_response_processor_1 = __importDefault(require("./processors/modify_response_processor"));
const modify_request_processor_1 = __importDefault(require("./processors/modify_request_processor"));
const insert_processor_1 = __importDefault(require("./processors/insert_processor"));
const utils_1 = require("./utils");
class RuleActionProcessor {
    constructor() {
        /*
        @return: Whether to continue with the proxy callback. & of all the continue_request from actions
        */
        this.process_actions = async (rule_actions, ctx) => {
            /*
              action_result_objs = [{action: {}, result: {}}}]
            */
            const action_result_objs = await Promise.all(rule_actions.map(async (action) => {
                let action_result_obj = await this.process_action(action, ctx);
                return action_result_obj;
            }));
            let continue_request = true;
            continue_request = this.post_process_actions(action_result_objs, ctx);
            return { action_result_objs, continue_request };
        };
        this.post_process_actions = (action_result_objs, ctx) => {
            let continue_request = true;
            action_result_objs.forEach((action_result) => {
                if (!continue_request)
                    return; // Already finished the request
                if (!action_result.post_process_data)
                    return; // No post processing
                const status_code = action_result.post_process_data.status_code || 200;
                const headers = action_result.post_process_data.headers || {};
                let body = action_result.post_process_data.body || null;
                // console.log("Log", ctx.rq.original_request);
                if (typeof (body) !== 'string') {
                    body = JSON.stringify(body);
                }
                ctx.proxyToClientResponse.writeHead(status_code, headers).end(body);
                ctx.rq.request_finished = true;
                ctx.rq.set_final_response({
                    status_code: status_code,
                    headers: headers,
                    body: body,
                });
                continue_request = false;
            });
            return continue_request;
        };
        /*
        @return: Whether to continue with the proxy callback
        */
        this.process_action = async (rule_action, ctx) => {
            let action_result = (0, utils_1.build_action_processor_response)(rule_action, false);
            if (!rule_action) {
                return action_result;
            }
            switch (rule_action.action) {
                case constants_1.RULE_ACTION.REDIRECT:
                    action_result = (0, redirect_processor_1.default)(rule_action, ctx);
                    break;
                case constants_1.RULE_ACTION.MODIFY_HEADERS:
                    action_result = (0, modify_header_processor_1.default)(rule_action, ctx);
                    break;
                case constants_1.RULE_ACTION.MODIFY_USER_AGENT:
                    action_result = (0, modify_user_agent_processor_1.default)(rule_action, ctx);
                case constants_1.RULE_ACTION.DELAY:
                    action_result = await (0, delay_processor_1.default)(rule_action, ctx);
                    break;
                case constants_1.RULE_ACTION.BLOCK:
                    action_result = (0, block_processor_1.default)(rule_action, ctx);
                    break;
                case constants_1.RULE_ACTION.MODIFY_REQUEST:
                    action_result = (0, modify_request_processor_1.default)(rule_action, ctx);
                    break;
                case constants_1.RULE_ACTION.MODIFY_RESPONSE:
                    action_result = await (0, modify_response_processor_1.default)(rule_action, ctx);
                    break;
                case constants_1.RULE_ACTION.INSERT:
                    action_result = (0, insert_processor_1.default)(rule_action, ctx);
                default:
                    break;
            }
            return action_result;
        };
    }
}
exports.default = RuleActionProcessor;
