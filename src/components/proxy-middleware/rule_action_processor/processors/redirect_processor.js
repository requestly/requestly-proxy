import { PROXY_HANDLER_TYPE } from "../../../../lib/proxy";
import {
  get_request_url,
  is_request_preflight,
} from "../../helpers/proxy_ctx_helper";
import modifiedRequestsPool from "../modified_requests_pool";
import handleMixedResponse from "../handle_mixed_response";
import {
  build_action_processor_response,
  build_post_process_data,
  stripHopByHopHeaders,
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

  const { status: isMixedResponse, response_data } = await handleMixedResponse(
    ctx,
    new_url
  );

  if (isMixedResponse) {
    // Feed the fetched response into the response context, then run the existing
    // response Modify Headers processor against the destination URL.
    ctx.serverToProxyResponse = {
      statusCode: response_data.status_code,
      headers: { ...(response_data.headers || {}) },
    };
    if (typeof ctx.rq.applyResponseHeaderRulesForRedirect === "function") {
      ctx.rq.applyResponseHeaderRulesForRedirect(new_url);
    }
    const headers = stripHopByHopHeaders(ctx.serverToProxyResponse.headers);

    // Recalculate content-length for the flattened buffer
    let body = response_data.body;
    if (body !== null && body !== undefined) {
      if (Buffer.isBuffer(body)) {
        headers['content-length'] = body.length;
      } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
        headers['content-length'] = body.byteLength;
      } else if (typeof body === 'string') {
        headers['content-length'] = Buffer.byteLength(body);
      } else {
        headers['content-length'] = Buffer.byteLength(JSON.stringify(body));
      }
    } else {
      headers["content-length"] = 0;
    }

    return build_action_processor_response(
      action,
      true,
      build_post_process_data(response_data.status_code, headers, body)
    );
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
