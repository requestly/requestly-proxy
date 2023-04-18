import { get_success_actions_from_action_results } from "../rule_action_processor/utils";
import { createHarEntry } from "../helpers/harObectCreator";
import ILoggerService from "../../interfaces/logger-service";
import { DesktopNetworkLog, DesktopNetworkLogEvent, DesktopNetworkLogEventType, RQRuleAction } from "../../../types/proxy";
import { Entry as HAREntry } from "har-format";

class LoggerMiddleware {
  is_active: boolean;
  loggerService: ILoggerService
  
  constructor(is_active: boolean, loggerService: ILoggerService) {
    this.is_active = is_active;
    this.loggerService = loggerService;
  }

  sendNetworkLogEvent = (type: DesktopNetworkLogEventType, ctx: any, actionResultObjs: RQRuleAction[]) => {
    if(!type) {
      console.log("[logger_middleware] sendNetworkLogEvent type is required");
    }
    
    const event: DesktopNetworkLogEvent = {
      type,
      data: this.createNetworkLogEventData(ctx, actionResultObjs)
    }

    this.loggerService.sendLogEvent(event, ctx.rq.final_request.headers || {})
  }

  createNetworkLogEventData = (ctx: any, actionResultObjs: RQRuleAction[]): DesktopNetworkLog => {
    const protocol = ctx.isSSL ? "https" : "http";
    const harEntry: HAREntry = createHarEntry(
      ctx.rq.final_request.headers,
      ctx.rq.final_request.method,
      protocol,
      ctx.rq.final_request.host,
      ctx.rq.final_request.path,
      ctx.rq.final_request.body,
      ctx.rq.final_response.status_code,
      ctx.rq.final_response.body,
      ctx.rq.final_response.headers || {},
    ) as HAREntry;

    const log: DesktopNetworkLog = {
      id: ctx.uuid,
      data: harEntry,
      actions: get_success_actions_from_action_results(actionResultObjs),
    };

    return log;
  }

}

export default LoggerMiddleware;
