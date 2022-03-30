export default process_insert_action;
declare function process_insert_action(action: any, ctx: any): {
    action: any;
    success: boolean;
    post_process_data: any;
};
