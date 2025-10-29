import fs from "fs";

export const build_action_processor_response = (
  action,
  success = false,
  post_process_data = null
) => {
  let resp = {
    action: action,
    success: success,
    post_process_data: post_process_data,
  };

  return resp;
};

export const build_post_process_data = (status_code, headers, body) => {
  if (!status_code && !headers && !body) {
    return null;
  }

  let data = {
    status_code,
    headers,
    body,
  };

  return data;
};

export const get_success_actions_from_action_results = (
  action_result_objs = []
) => {
  if (!action_result_objs) {
    return [];
  }

  // BY default success is false
  const success_action_results_objs = action_result_objs.filter(
    (obj) => obj && obj && obj.success === true
  );

  return success_action_results_objs.map((obj) => obj.action);
};

export const getHost = (ctx) => {
  const finalHost = ctx.rq.final_request.host;
  const port = ctx.rq.final_request.port;
  const protocol = ctx.isSSL ? "https" : "http";
  const standardPort = protocol === "https" ? 443 : 80;

  // Only append port if it's non-standard and not already in the host
  if (port && port !== standardPort && !finalHost.includes(':')) {
    return `${finalHost}:${port}`;
  }

  return finalHost;
}

export const get_file_contents = (file_path) => {
  return fs.readFileSync(file_path, "utf-8");
}