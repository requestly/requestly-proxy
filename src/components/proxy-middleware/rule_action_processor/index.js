import { RULE_ACTION } from "../constants";
import process_redirect_action from "./processors/redirect_processor";
import process_modify_header_action from "./processors/modify_header_processor";
import process_modify_user_agent_action from "./processors/modify_user_agent_processor";
import process_delay_action from "./processors/delay_processor";
import process_block_action from "./processors/block_processor";
import process_modify_response_action from "./processors/modify_response_processor";
import process_modify_request_action from "./processors/modify_request_processor";
import process_insert_action from "./processors/insert_processor";
import { build_action_processor_response } from "./utils";

class RuleActionProcessor {
  constructor() {}

  /*
  @return: Whether to continue with the proxy callback. & of all the continue_request from actions
  */
  process_actions = async (rule_actions, ctx) => {
    /*
      action_result_objs = [{action: {}, result: {}}}]
    */
    const action_result_objs = await Promise.all(
      rule_actions.map(async (action) => {
        let action_result_obj = await this.process_action(action, ctx);
        return action_result_obj;
      })
    );

    let continue_request = true;
    continue_request = this.post_process_actions(action_result_objs, ctx);

    return { action_result_objs, continue_request };
  };

  post_process_actions = (action_result_objs, ctx) => {
    let continue_request = true;

    action_result_objs.forEach((action_result) => {
      if (!continue_request) return; // Already finished the request
      if (!action_result.post_process_data) return; // No post processing

      const status_code = action_result.post_process_data.status_code || 200;
      const headers = action_result.post_process_data.headers || {};
      let body = action_result.post_process_data.body || null;

      // console.log("Log", ctx.rq.original_request);
      if(typeof(body) !== 'string') {
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
  process_action = async (rule_action, ctx) => {
    let action_result = build_action_processor_response(rule_action, false);

    if (!rule_action) {
      return action_result;
    }

    switch (rule_action.action) {
      case RULE_ACTION.REDIRECT:
        action_result = process_redirect_action(rule_action, ctx);
        break;
      case RULE_ACTION.MODIFY_HEADERS:
        action_result = process_modify_header_action(rule_action, ctx);
        break;
      case RULE_ACTION.MODIFY_USER_AGENT:
        action_result = process_modify_user_agent_action(rule_action, ctx);
      case RULE_ACTION.DELAY:
        action_result = await process_delay_action(rule_action, ctx);
        break;
      case RULE_ACTION.BLOCK:
        action_result = process_block_action(rule_action, ctx);
        break;
      case RULE_ACTION.MODIFY_REQUEST:
        action_result = process_modify_request_action(rule_action, ctx);
        break;
      case RULE_ACTION.MODIFY_RESPONSE:
        action_result = await process_modify_response_action(rule_action, ctx);
        break;
      case RULE_ACTION.INSERT:
        action_result = process_insert_action(rule_action, ctx);
      default:
        break;
    }

    return action_result;
  };
}

export default RuleActionProcessor;
