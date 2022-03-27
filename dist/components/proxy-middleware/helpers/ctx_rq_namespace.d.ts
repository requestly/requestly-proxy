export default CtxRQNamespace;
declare class CtxRQNamespace {
    original_request: {};
    original_response: {};
    final_request: {};
    final_response: {};
    set_original_request: ({ method, path, host, port, headers, agent, body, query_params, }: {
        method?: any;
        path?: any;
        host?: any;
        port?: any;
        headers?: any;
        agent?: any;
        body?: any;
        query_params?: any;
    }) => void;
    set_original_response: ({ status_code, headers, body, query_params, }: {
        status_code?: any;
        headers?: any;
        body?: any;
        query_params?: any;
    }) => void;
    set_final_request: (proxyToServerRequestOptions: any) => void;
    set_final_response: ({ status_code, headers, body, }: {
        status_code?: any;
        headers?: any;
        body?: any;
    }) => void;
    /**
     * Note:
     * 1. Gives body only if called after request end
     * 2. Currently only works for JSON body because we only provide json targetting on body right now
     */
    get_json_request_body: () => any;
}
