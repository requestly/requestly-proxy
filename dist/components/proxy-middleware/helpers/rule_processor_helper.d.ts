export default RuleProcessorHelper;
declare class RuleProcessorHelper {
    constructor(request_data?: any, response_data?: any);
    request_data: any;
    response_data: any;
    init_request_data: (request_data: any) => void;
    init_response_data: (response_data: any) => void;
    process_rules: (rules: any, is_response?: boolean) => any;
    process_rule: (rule: any, is_response?: boolean) => any;
    add_rule_details_to_action: (rule_action: any, rule: any) => any;
    process_url_modification_rule: (rule_processor: any, rule: any) => any;
    process_response_modification_rule: (rule_processor: any, rule: any) => any;
    process_request_headers_modification_rule: (rule_processor: any, rule: any) => any;
    process_response_headers_modification_rule: (rule_processor: any, rule: any) => any;
    process_user_agent_modification_rule: (rule_processor: any, rule: any) => any;
}
