export default process_delay_action;
declare function process_delay_action(action: any, ctx: any): Promise<{
    action: any;
    success: boolean;
    post_process_data: any;
}>;
