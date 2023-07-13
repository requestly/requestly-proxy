import { cloneDeep } from "lodash";
import HTTPSnippet from "httpsnippet";
import { get_success_actions_from_action_results } from "../rule_action_processor/utils";
import ILoggerService from "../../interfaces/logger-service";
import { addCustomDetailsToHarEntries } from "../helpers/harObectCreator";

type RequestState = "request_started" | "request_end" | "response_end";

class LoggerMiddleware {
  is_active: boolean
  loggerService: ILoggerService


  constructor(is_active, loggerService) {
    this.is_active = is_active;
    this.loggerService = loggerService;
  }

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

  send_network_log = (ctx, action_result_objs = [], requestState = "") => {
    this.loggerService.addLog(
      this.createLog(ctx, action_result_objs, requestState),
      ctx.rq.final_request.headers || {}
    );
  };

  private createLog = (ctx, action_result_objs = [], requestState = "") => {
    const rqLog = {
      id: ctx.uuid,
      timestamp: Math.floor(Date.now() / 1000),
      finalHar: ctx.rq.getHar(),
      requestShellCurl: this.generate_curl_from_har(
        ctx?.rq?.final_request?.requestHarObject
      ), // TODO: Move this to client side
      actions: get_success_actions_from_action_results(action_result_objs),
      consoleLogs: ctx?.rq?.consoleLogs,
      requestState,
    };
    return rqLog;
  };

  sendNetworkEvent(ctx, actions = [], requestState: RequestState) {
    const event = {
      type: requestState,
      data: this.createNetworkEvent(ctx, actions) 
    }
    this.loggerService.addLog(event, {}) // todo: remove the second parameter, not used
  }

  private createNetworkEvent(ctx, actions) {
    let eventHar = ctx.rq.getHar()
    eventHar = addCustomDetailsToHarEntries(eventHar, {
      id: ctx.uuid,
      consoleLogs: ctx.rq.consoleLogs
    })

    // todo: domain and app check

    const event = {
      id: ctx.uuid,
      data: eventHar,
      actions
    }
    return event
  }
}

export default LoggerMiddleware;
