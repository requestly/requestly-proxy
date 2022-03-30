export default RulesMiddleware;
declare class RulesMiddleware {
    constructor(is_active: any, ctx: any, rulesHelper: any);
    is_active: any;
    rule_processor_helper: RuleProcessorHelper;
    rule_action_processor: RuleActionProcessor;
    rulesHelper: any;
    on_request_actions: any[];
    on_response_actions: any[];
    action_result_objs: any[];
    _init_request_data: (ctx: any) => void;
    request_data: any;
    _init_response_data: (ctx: any) => void;
    response_data: {
        response_headers: any;
    };
    _update_request_data: (data: any) => void;
    _fetch_rules: () => void;
    active_rules: any;
    _process_rules: (is_response?: boolean) => any;
    _update_action_result_objs: (action_result_objs?: any[]) => void;
    on_request: (ctx: any) => Promise<any[] | {
        action_result_objs: any[];
        continue_request: boolean;
    }>;
    on_response: (ctx: any) => Promise<any[] | {
        action_result_objs: any[];
        continue_request: boolean;
    }>;
    on_response_end: (ctx: any) => Promise<any[] | {
        action_result_objs: any[];
        continue_request: boolean;
    }>;
}
import RuleProcessorHelper from "../helpers/rule_processor_helper";
import RuleActionProcessor from "../rule_action_processor";
