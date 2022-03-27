export default process_block_action;
declare function process_block_action(action: any, ctx: any): Promise<{
    action: any;
    success: boolean;
    post_process_data: any;
}>;
