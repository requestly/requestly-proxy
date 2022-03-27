import { v4 as uuidv4 } from "uuid";
import { cloneDeep } from "lodash";
import { ipcRenderer } from "electron";
import HTTPSnippet from "httpsnippet";
import { get_success_actions_from_action_results } from "../rule_action_processor/utils";
const url = require("url");

class LoggerMiddleware {
  constructor(is_active) {
    this.is_active = is_active;
  }

  on_response_end = (ctx, actions = [], body = null, statusCode = null) => {
    if (!this.is_active) {
      return true;
    }

    this.send_network_log(ctx, actions, body, statusCode);
  };

  send_network_log = (ctx, actions = [], body = null, statusCode = null) => {
    const log = {
      id: uuidv4(),
      timestamp: Math.floor(Date.now() / 1000),
      url: url.parse(
        (ctx.isSSL ? "https://" : "http://") +
          ctx.clientToProxyRequest.headers.host +
          ctx.clientToProxyRequest.url
      ).href,
      request: {
        method: ctx.proxyToServerRequestOptions.method,
        path: ctx.proxyToServerRequestOptions.path,
        host: ctx.proxyToServerRequestOptions.host,
        port: ctx.proxyToServerRequestOptions.port,
        headers: ctx.proxyToServerRequestOptions.headers,
      },
      response: {
        statusCode: statusCode || ctx.serverToProxyResponse.statusCode,
        headers: ctx.serverToProxyResponse.headers,
        contentType:
          (ctx.serverToProxyResponse.headers["content-type"] &&
            ctx.serverToProxyResponse.headers["content-type"].includes(";") &&
            ctx.serverToProxyResponse.headers["content-type"].split(";")[0]) ||
          ctx.serverToProxyResponse.headers["content-type"],
        body: body || null,
      },
      actions: actions,
    };
    ipcRenderer.send("log-network-request", log);
  };

  generate_curl_from_har = (requestHarObject) => {
    if (!requestHarObject) {
      return "";
    }
    let requestCurl = "";
    try {
      const harObject = cloneDeep(requestHarObject);
      requestCurl = new HTTPSnippet(harObject).convert("shell", "curl", {
        indent: " ",
      });
    } catch (err) {
      console.error(`LoggerMiddleware.generate_curl_from_har Error: ${err}`);
    }
    return requestCurl;
  };

  send_network_log_v2 = (ctx, action_result_objs = []) => {
    let query_params_string;
    if (ctx.rq.final_request.query_params) {
      query_params_string = JSON.stringify(ctx.rq.final_request.query_params);
    }
    const log = {
      id: ctx.uuid,
      timestamp: Math.floor(Date.now() / 1000),
      url: url.parse(
        (ctx.isSSL ? "https://" : "http://") +
          ctx.clientToProxyRequest.headers.host +
          ctx.clientToProxyRequest.url
      ).href,
      request: {
        method: ctx.rq.final_request.method,
        path: ctx.rq.final_request.path,
        host: ctx.rq.final_request.host,
        port: ctx.rq.final_request.port,
        headers: ctx.rq.final_request.headers,
        body: ctx.rq.final_request.body,
        query_params: query_params_string,
      },
      requestShellCurl: this.generate_curl_from_har(
        ctx.rq.final_request.requestHarObject
      ),
      response: {
        statusCode: ctx.rq.final_response.status_code,
        headers: ctx.rq.final_response.headers || {},
        contentType:
          (ctx.rq.final_response.headers &&
            ctx.rq.final_response.headers["content-type"] &&
            ctx.rq.final_response.headers["content-type"].includes(";") &&
            ctx.rq.final_response.headers["content-type"].split(";")[0]) ||
          (ctx.rq.final_response.headers &&
            ctx.rq.final_response.headers["content-type"]),
        body: ctx.rq.final_response.body || null,
      },
      actions: get_success_actions_from_action_results(action_result_objs),
    };
    ipcRenderer.send("log-network-request", log);
  };
}

export default LoggerMiddleware;
