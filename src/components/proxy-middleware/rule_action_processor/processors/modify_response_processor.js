import { PROXY_HANDLER_TYPE } from "../../../../lib/proxy";

import {
  CONSTANTS as GLOBAL_CONSTANTS,
} from "@requestly/requestly-core";
import { get_request_url } from "../../helpers/proxy_ctx_helper";
import { build_action_processor_response } from "../utils";
import fs from "fs";
import { parseJsonBody } from "../../helpers/http_helpers";
import ConsoleCapture from "capture-console-logs";
import { getFunctionFromString } from "../../../../utils";

const { types } = require("util");

const process_modify_response_action = async (action, ctx) => {
  const allowed_handlers = [PROXY_HANDLER_TYPE.ON_RESPONSE_END, PROXY_HANDLER_TYPE.ON_ERROR];

  if (!allowed_handlers.includes(ctx.currentHandler)) {
    return build_action_processor_response(action, false);
  }

  if (
    action.responseType &&
    action.responseType === GLOBAL_CONSTANTS.RESPONSE_BODY_TYPES.CODE
  ) {
    await modify_response_using_code(action, ctx);
    return build_action_processor_response(action, true);
  } else if (
    action.responseType === GLOBAL_CONSTANTS.RESPONSE_BODY_TYPES.LOCAL_FILE
  ) {
    modify_response_using_local(action, ctx);
    return build_action_processor_response(action, true);
  } else {
    modify_response(ctx, action.response, action.statusCode);
    return build_action_processor_response(action, true);
  }
};

const modify_response = (ctx, new_resp, status_code) => {
  ctx.rq_response_body = new_resp;
  ctx.rq_response_status_code = status_code;
};

const modify_response_using_local = (action, ctx) => {
  let data;
  try {
    data = fs.readFileSync(action.response, "utf-8");
    modify_response(ctx, data, action.statusCode);
  } catch (err) {
    console.log("Some Error while reading file");
  }
};

const modify_response_using_code = async (action, ctx) => {
  let userFunction = null;
  try {
    userFunction = getFunctionFromString(action.response);
  } catch (error) {
    // User has provided an invalid function
    return modify_response(
      ctx,
      "Can't parse Requestly function. Please recheck. Error Code 7201. Actual Error: " +
        error.message
    );
  }

  if (!userFunction || typeof userFunction !== "function") {
    // User has provided an invalid function
    return modify_response(
      ctx,
      "Can't parse Requestly function. Please recheck. Error Code 944."
    );
  }

  // Everything good so far. Now try to execute user's function
  let finalResponse = null;

  try {
    const args = {
      method: ctx.clientToProxyRequest
        ? ctx.clientToProxyRequest.method
          ? ctx.clientToProxyRequest.method
          : null
        : null,
      response: ctx?.rq_response_body,
      url: get_request_url(ctx),
      responseType: ctx?.serverToProxyResponse?.headers?.["content-type"],
      requestHeaders: ctx.clientToProxyRequest.headers,
      requestData: parseJsonBody(ctx.rq?.final_request?.body) || null,
    };

    try {
      args.responseJSON = JSON.parse(args.response);
    } catch {
      /*Do nothing -- could not parse body as JSON */
    }

    const consoleCapture = new ConsoleCapture()
    consoleCapture.start(true)

    finalResponse = userFunction(args);

    if (types.isPromise(finalResponse)) {
      finalResponse = await finalResponse;
    }

    consoleCapture.stop()
    const consoleLogs = consoleCapture.getCaptures()
    
    ctx.rq.consoleLogs.push(...consoleLogs)

    if (typeof finalResponse === "object") {
      finalResponse = JSON.stringify(finalResponse);
    }

    if (finalResponse && typeof finalResponse === "string") {
      return modify_response(ctx, finalResponse, action.statusCode);
    } else throw new Error("Returned value is not a string");
  } catch (error) {
    // Function parsed but failed to execute
    return modify_response(
      ctx,
      "Can't execute Requestly function. Please recheck. Error Code 187. Actual Error: " +
        error.message
    );
  }
};

export default process_modify_response_action;
