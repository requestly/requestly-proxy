import { PROXY_HANDLER_TYPE } from "../../../../lib/proxy";
import { build_action_processor_response } from "../utils";

const resolveAfterDelay = async (durationInMs) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("resolved");
    }, durationInMs);
  });
};

const process_delay_action = async (action, ctx) => {
  const allowed_handlers = [PROXY_HANDLER_TYPE.ON_REQUEST];

  if (!allowed_handlers.includes(ctx.currentHandler)) {
    return build_action_processor_response(action, false);
  }

  await resolveAfterDelay(action.delay);
  return build_action_processor_response(action, true);
};

export default process_delay_action;
