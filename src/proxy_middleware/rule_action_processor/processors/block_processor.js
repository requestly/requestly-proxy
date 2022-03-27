import { PROXY_HANDLER_TYPE } from "../../../../../renderer/rq-proxy/lib/proxy";
import {
  build_action_processor_response,
  build_post_process_data,
} from "../utils";

const process_block_action = async (action, ctx) => {
  const allowed_handlers = [PROXY_HANDLER_TYPE.ON_REQUEST];

  if (!allowed_handlers.includes(ctx.currentHandler)) {
    return build_action_processor_response(action, false);
  }

  return build_action_processor_response(
    action,
    true,
    build_post_process_data(
      418 /** Move this to temporarily out of coffee (503) if causes issues in someone production use case. // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418 */,
      { "Cache-Control": "no-cache" },
      "Access to this URL has been blocked by Requestly"
    )
  );
};

export default process_block_action;
