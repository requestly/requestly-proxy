export default process_modify_response_action;
declare function process_modify_response_action(action: any, ctx: any): Promise<{
    action: any;
    success: boolean;
    post_process_data: any;
}>;
