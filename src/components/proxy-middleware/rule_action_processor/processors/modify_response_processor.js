import { PROXY_HANDLER_TYPE } from "../../../../lib/proxy";

import {
  CONSTANTS as GLOBAL_CONSTANTS,
} from "@requestly/requestly-core";
import { getResponseContentTypeHeader, getResponseHeaders, get_request_url } from "../../helpers/proxy_ctx_helper";
import { build_action_processor_response, build_post_process_data } from "../utils";
import fs from "fs";
import { getContentType, parseJsonBody } from "../../helpers/http_helpers";
import { executeUserFunction, getFunctionFromString } from "../../../../utils";
import { RQ_INTERCEPTED_CONTENT_TYPES } from "../../constants";

const process_modify_response_action = async (action, ctx) => {
  const allowed_handlers = [PROXY_HANDLER_TYPE.ON_REQUEST,PROXY_HANDLER_TYPE.ON_RESPONSE_END, PROXY_HANDLER_TYPE.ON_ERROR];

  if (!allowed_handlers.includes(ctx.currentHandler)) {
    return build_action_processor_response(action, false);
  }

  if(ctx.currentHandler === PROXY_HANDLER_TYPE.ON_REQUEST) {
    if(
      action.responseType === GLOBAL_CONSTANTS.RESPONSE_BODY_TYPES.STATIC 
      && action.serveWithoutRequest 
    ) {
      let contentType, finalBody;
      try {
        finalBody =  JSON.parse(action.response)
        contentType =  "application/json";
      } catch {
        contentType = "text/plain"
        finalBody = action.response
      }
      const status = action.statusCode || 200
      
      const finalHeaders = {"Content-Type": contentType}
      modify_response(ctx, finalBody, status)
      return build_action_processor_response(
        action, 
        true, 
        build_post_process_data(
          status,
          finalHeaders,
          finalBody,
        )
      )
    }

    return build_action_processor_response(action, false);
  }

  if (
    action.responseType &&
    action.responseType === GLOBAL_CONSTANTS.RESPONSE_BODY_TYPES.CODE
  ) {
    const contentTypeHeader = getResponseContentTypeHeader(ctx);
    const contentType = getContentType(contentTypeHeader);
    if (RQ_INTERCEPTED_CONTENT_TYPES.includes(contentType) || contentType == null) {
      await modify_response_using_code(action, ctx);
      delete_breaking_headers(ctx);
      return build_action_processor_response(action, true);
    }

    // Sentry not working
    // Sentry.captureException(new Error(`Content Type ${contentType} not supported for modification in programmatic mode`));
    console.log(`Content Type ${contentType} not supported for modification in programmatic mode`);
    return build_action_processor_response(action, false);
  } else if (
    action.responseType === GLOBAL_CONSTANTS.RESPONSE_BODY_TYPES.LOCAL_FILE
  ) {
    modify_response_using_local(action, ctx);
    delete_breaking_headers(ctx);
    return build_action_processor_response(action, true);
  } else {
    modify_response(ctx, action.response, action.statusCode);
    delete_breaking_headers(ctx);
    return build_action_processor_response(action, true);
  }
};

const delete_breaking_headers = (ctx) => {
  delete getResponseHeaders(ctx)['content-length'];
}

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
    console.log("Error reading file", err)
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
      response: ctx?.rq_parsed_response_body,
      url: get_request_url(ctx),
      responseType: ctx?.serverToProxyResponse?.headers?.["content-type"],
      requestHeaders: ctx.clientToProxyRequest.headers,
      requestData: parseJsonBody(ctx.rq?.final_request?.body) || null,
      statusCode: ctx.serverToProxyResponse.statusCode,
    };

    try {
      args.responseJSON = JSON.parse(args.response);
    } catch {
      /*Do nothing -- could not parse body as JSON */
    }

    finalResponse = await executeUserFunction(ctx, action.response, args)

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
