export default process_redirect_action;
declare function process_redirect_action(action: any, ctx: any): Promise<true | {
    action: any;
    success: boolean;
    post_process_data: any;
}>;
