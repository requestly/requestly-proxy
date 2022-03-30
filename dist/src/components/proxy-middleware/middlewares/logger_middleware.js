"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const httpsnippet_1 = __importDefault(require("httpsnippet"));
const utils_1 = require("../rule_action_processor/utils");
const url = require("url");
class LoggerMiddleware {
    constructor(is_active, loggerService) {
        this.generate_curl_from_har = (requestHarObject) => {
            if (!requestHarObject) {
                return "";
            }
            let requestCurl = "";
            try {
                const harObject = (0, lodash_1.cloneDeep)(requestHarObject);
                requestCurl = new httpsnippet_1.default(harObject).convert("shell", "curl", {
                    indent: " ",
                });
            }
            catch (err) {
                console.error(`LoggerMiddleware.generate_curl_from_har Error: ${err}`);
            }
            return requestCurl;
        };
        this.send_network_log_v2 = (ctx, action_result_objs = []) => {
            let query_params_string;
            if (ctx.rq.final_request.query_params) {
                query_params_string = JSON.stringify(ctx.rq.final_request.query_params);
            }
            const log = {
                id: ctx.uuid,
                timestamp: Math.floor(Date.now() / 1000),
                url: url.parse((ctx.isSSL ? "https://" : "http://") +
                    ctx.clientToProxyRequest.headers.host +
                    ctx.clientToProxyRequest.url).href,
                request: {
                    method: ctx.rq.final_request.method,
                    path: ctx.rq.final_request.path,
                    host: ctx.rq.final_request.host,
                    port: ctx.rq.final_request.port,
                    headers: ctx.rq.final_request.headers,
                    body: ctx.rq.final_request.body,
                    query_params: query_params_string,
                },
                requestShellCurl: this.generate_curl_from_har(ctx.rq.final_request.requestHarObject),
                response: {
                    statusCode: ctx.rq.final_response.status_code,
                    headers: ctx.rq.final_response.headers || {},
                    contentType: (ctx.rq.final_response.headers &&
                        ctx.rq.final_response.headers["content-type"] &&
                        ctx.rq.final_response.headers["content-type"].includes(";") &&
                        ctx.rq.final_response.headers["content-type"].split(";")[0]) ||
                        (ctx.rq.final_response.headers &&
                            ctx.rq.final_response.headers["content-type"]),
                    body: ctx.rq.final_response.body || null,
                },
                actions: (0, utils_1.get_success_actions_from_action_results)(action_result_objs),
            };
            // ipcRenderer.send("log-network-request", log);
            // TODO: Sending log for now. Ideally this should be har object
            this.loggerService.addLog(log, ctx.rq.final_request.headers || {});
        };
        this.is_active = is_active;
        this.loggerService = loggerService;
    }
}
exports.default = LoggerMiddleware;
