export default RuleActionProcessor;
declare class RuleActionProcessor {
    process_actions: (rule_actions: any, ctx: any) => Promise<{
        action_result_objs: any[];
        continue_request: boolean;
    }>;
    post_process_actions: (action_result_objs: any, ctx: any) => boolean;
    process_action: (rule_action: any, ctx: any) => Promise<{
        action: any;
        success: boolean;
        post_process_data: any;
    }>;
}
