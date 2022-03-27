import { PROXY_HANDLER_TYPE } from "../../../../../renderer/rq-proxy/lib/proxy";
import { build_action_processor_response } from "../utils";

const process_modify_user_agent_action = (action, ctx) => {
  const allowed_handlers = [PROXY_HANDLER_TYPE.ON_REQUEST];

  if (!allowed_handlers.includes(ctx.currentHandler)) {
    return build_action_processor_response(action, false);
  }

  if (ctx.currentHandler == PROXY_HANDLER_TYPE.ON_REQUEST) {
    modify_request_headers(action, ctx);
    return build_action_processor_response(action, true);
  }
};

const modify_request_headers = (action, ctx) => {
  const newRequestHeaders = action.newRequestHeaders;
  for (var headerName in ctx.proxyToServerRequestOptions.headers) {
    if (ctx.proxyToServerRequestOptions.headers.hasOwnProperty(headerName)) {
      delete ctx.proxyToServerRequestOptions.headers[headerName];
    }
  }

  // Set Request Headers
  newRequestHeaders.forEach(
    (pair) => (ctx.proxyToServerRequestOptions.headers[pair.name] = pair.value)
  );
};

export default process_modify_user_agent_action;
