import { Agent as httpAgent } from "http";
import { Agent as httpsAgent } from "https";
import { createHar, createRequestHarObject } from "./harObectCreator";
import { Log as ConsoleLog } from "capture-console-logs/src/logs"

interface RQRequest {
  method: string
  path: string,
  host: string,
  port: number
  headers: Record<string, string>
  agent: httpAgent | httpsAgent
  body: unknown
  query_params: string // json
}

interface RQResponse {
  status_code: number
  headers: Record<string, string>
  body: unknown
}

interface finalRequest extends RQRequest { // will be removed later
  requestHarObject: any // har
}

class CtxRQNamespace {
  original_request: Partial<RQRequest> 
  original_response: Partial<RQResponse>
  final_request: Partial<finalRequest> 
  final_response: Partial<RQResponse>
  
  consoleLogs: ConsoleLog[]
  

  constructor() {
    this.original_request = {
      // method: ctx.clientToProxyRequest.method,
      // path: ctx.clientToProxyRequest.url,
      // host: hostPort.host,
      // port: hostPort.port,
      // headers: headers,
      // agent: ctx.isSSL ? self.httpsAgent : self.httpAgent,
      // body: body
      // query_params: query_params // json
    };
    this.original_response = {
      // status_code,
      // headers,
      // body
    };

    this.final_request = {
      // method: ctx.clientToProxyRequest.method,
      // path: ctx.clientToProxyRequest.url,
      // host: hostPort.host,
      // port: hostPort.port,
      // headers: headers,
      // agent: ctx.isSSL ? self.httpsAgent : self.httpAgent,
      // body: body
      // query_params: query_params // json
    };
    this.final_response = {
      // status_code,
      // headers,
      // body
    };

    this.consoleLogs = [];
  }

  getHar() {
    const protocol =  this.final_request.agent instanceof httpAgent ? "http" : "https"

    return createHar(
      this.final_request.headers,
      this.final_request.method,
      protocol,
      this.final_request.host,
      this.final_request.path,
      this.final_request.body,
      this.final_response.status_code,
      this.final_response.body,
      this.final_response.headers,
      this.final_request.query_params
    )
  }

  getOriginalHar() {
    const protocol =  this.original_request.agent instanceof httpAgent ? "http" : "https"

    return createHar(
      this.original_request.headers,
      this.original_request.method,
      protocol,
      this.original_request.host,
      this.original_request.path,
      this.original_request.body,
      this.original_response.status_code,
      this.original_response.body,
      this.original_response.headers,
      this.original_request.query_params
    )
  }

  set_original_request = ({
    method = null,
    path = null,
    host = null,
    port = null,
    headers = null,
    agent = null,
    body = null,
    query_params = null,
  }) => {
    if (headers) {
      this.original_request.headers = { ...headers };
    }

    this.original_request.method = method || this.original_request.method;
    this.original_request.path = path || this.original_request.path;
    this.original_request.host = host || this.original_request.host;
    this.original_request.port = port || this.original_request.port;
    this.original_request.agent = agent || this.original_request.agent;
    this.original_request.body = body || this.original_request.body;
    this.original_request.query_params =
      query_params || this.original_request.query_params;
  };

  set_original_response = ({
    status_code = null,
    headers = null,
    body = null,
    query_params = null,
  }) => {
    if (headers) {
      this.original_response.headers = { ...headers };
    }

    this.original_response.status_code =
      status_code || this.original_response.status_code;
    this.original_response.body = body || this.original_response.body;
  };

  set_final_request = (proxyToServerRequestOptions) => {
    const { method, path, host, port, headers, agent, body, query_params } =
      proxyToServerRequestOptions;
    if (headers) {
      this.final_request.headers = { ...headers };
    }

    this.final_request.method = method || this.final_request.method;
    this.final_request.path = path || this.final_request.path;
    this.final_request.host = host || this.final_request.host;
    this.final_request.port = port || this.final_request.port;
    this.final_request.agent = agent || this.final_request.agent;
    this.final_request.body = body || this.final_request.body;
    this.final_request.query_params =
      query_params || this.final_request.query_params;
    this.final_request.requestHarObject = createRequestHarObject(
      this.final_request.requestHarObject || {},
      proxyToServerRequestOptions
    );
  };

  set_final_response = ({
    status_code = null,
    headers = null,
    body = null,
  }) => {
    if (headers) {
      this.final_response.headers = { ...headers };
    }

    this.final_response.status_code =
      status_code || this.final_response.status_code;
    this.final_response.body = body || this.final_response.body;
  };

  /**
   * Note:
   * 1. Gives body only if called after request end
   * 2. Currently only works for JSON body because we only provide json targetting on body right now
   */
  get_json_request_body = () => {
    try {
      return JSON.parse(this.original_request.body as string);
    } catch (e) {
      /* Body is still buffer array */
    }
    return null;
  };
}

export default CtxRQNamespace;
