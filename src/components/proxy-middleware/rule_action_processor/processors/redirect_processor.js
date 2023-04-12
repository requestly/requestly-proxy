import { PROXY_HANDLER_TYPE } from "../../../../lib/proxy";
import {
  get_request_url,
  is_request_preflight,
} from "../../helpers/proxy_ctx_helper";
import modifiedRequestsPool from "../modified_requests_pool";
import {makeExternalRequest, shouldMakeExternalRequest} from "../../helpers/redirectHelper";
import {
  build_action_processor_response,
  build_post_process_data,
} from "../utils";

// adding util to get origin header for handling cors
const getRequestOrigin = (ctx) => {
  const originalRequestHeaders = ctx.rq.original_request.headers || {};
  return (
    originalRequestHeaders["Origin"] ||
    originalRequestHeaders["origin"] ||
    originalRequestHeaders["ORIGIN"]
  );
};

const process_redirect_action = async (action, ctx) => {
  const allowed_handlers = [PROXY_HANDLER_TYPE.ON_REQUEST];

  if (!allowed_handlers.includes(ctx.currentHandler)) {
    return build_action_processor_response(action, false);
  }

  const current_url = get_request_url(ctx);
  const new_url = action.url;

  const request_url = current_url.replace(/www\./g, "");

  // Skip if already redirected
  if (modifiedRequestsPool.isURLModified(request_url)) {
    // Do nothing
    return build_action_processor_response(action, false);
  } else {
    modifiedRequestsPool.add(new_url);
  }

  // handle mixed content and redirect with preserve cookie
  if(shouldMakeExternalRequest(ctx, action)) {
    const { status: wasExternalRequestSuccessful, responseData } = await makeExternalRequest(ctx, new_url)
    console.log("debug: final response data", wasExternalRequestSuccessful, responseData)
    if (wasExternalRequestSuccessful) {
      return build_action_processor_response(
        action,
        true,
        build_post_process_data(
          responseData.status_code,
          responseData.headers,
          responseData.body
        )
      );
    }
  }

  // If this is a pre-flight request, don't redirect it
  if (is_request_preflight(ctx)) return true;

  return build_action_processor_response(
    action,
    true,
    build_post_process_data(
      307,
      {
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": getRequestOrigin(ctx) || "*",
        "Access-Control-Allow-Credentials": "true",
        Location: new_url,
      },
      null
    )
  );
};

export default process_redirect_action;
