import { PROXY_HANDLER_TYPE } from "../../../../lib/proxy";

import {
  CONSTANTS as GLOBAL_CONSTANTS,
} from "@requestly/requestly-core";
import { get_request_url } from "../../helpers/proxy_ctx_helper";
import { build_action_processor_response } from "../utils";
import ConsoleCapture from "capture-console-logs";
import { getFunctionFromString } from "../../../../utils";

const { types } = require("util");

const process_modify_request_action = (action, ctx) => {
  const allowed_handlers = [PROXY_HANDLER_TYPE.ON_REQUEST_END];

  if (!allowed_handlers.includes(ctx.currentHandler)) {
    return build_action_processor_response(action, false);
  }

  if (
    action.requestType &&
    action.requestType === GLOBAL_CONSTANTS.REQUEST_BODY_TYPES.CODE
  ) {
    modify_request_using_code(action, ctx);
    return build_action_processor_response(action, true);
  } else {
    modify_request(ctx, action.request);
    return build_action_processor_response(action, true);
  }
};

const modify_request = (ctx, new_req) => {
  if (new_req) ctx.rq_request_body = new_req;
};

const modify_request_using_code = async (action, ctx) => {
  let userFunction = null;
  try {
    userFunction = getFunctionFromString(action.request);
  } catch (error) {
    // User has provided an invalid function
    return modify_request(
      ctx,
      "Can't parse Requestly function. Please recheck. Error Code 7201. Actual Error: " +
        error.message
    );
  }

  if (!userFunction || typeof userFunction !== "function") {
    // User has provided an invalid function
    return modify_request(
      ctx,
      "Can't parse Requestly function. Please recheck. Error Code 944."
    );
  }

  // Everything good so far. Now try to execute user's function
  let finalRequest = null;

  try {
    const args = {
      method: ctx.clientToProxyRequest
        ? ctx.clientToProxyRequest.method
          ? ctx.clientToProxyRequest.method
          : null
        : null,
      request: ctx.rq_request_body,
      body: ctx.rq_request_body,
      url: get_request_url(ctx),
      requestHeaders: ctx.clientToProxyRequest.headers,
    };

    try {
      args.bodyAsJson = JSON.parse(args.request);
    } catch {
      /*Do nothing -- could not parse body as JSON */
    }

    const consoleCapture = new ConsoleCapture()
    consoleCapture.start(true)

    finalRequest = userFunction(args);

    if (types.isPromise(finalRequest)) {
      finalRequest = await finalRequest;
    }

    consoleCapture.stop()
    const consoleLogs = consoleCapture.getCaptures()

    ctx.rq.consoleLogs.push(...consoleLogs)

    const isRequestJSON = !!args.bodyAsJson;
    if (typeof finalRequest === "object" && isRequestJSON) {
      finalRequest = JSON.stringify(finalRequest);
    }

    if (finalRequest && typeof finalRequest === "string") {
      return modify_request(ctx, finalRequest);
    } else throw new Error("Returned value is not a string");
  } catch (error) {
    // Function parsed but failed to execute
    return modify_request(
      ctx,
      "Can't execute Requestly function. Please recheck. Error Code 187. Actual Error: " +
        error.message
    );
  }
};

export default process_modify_request_action;