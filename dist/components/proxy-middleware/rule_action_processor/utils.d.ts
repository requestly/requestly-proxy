export function build_action_processor_response(action: any, success?: boolean, post_process_data?: any): {
    action: any;
    success: boolean;
    post_process_data: any;
};
export function build_post_process_data(status_code: any, headers: any, body: any): {
    status_code: any;
    headers: any;
    body: any;
};
export function get_success_actions_from_action_results(action_result_objs?: any[]): any[];
