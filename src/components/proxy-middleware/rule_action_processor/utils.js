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

function isLocalHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
}

export const getHost = (ctx) => {
  const finalHost = ctx.rq.final_request.host;
  if(isLocalHost(finalHost) && ctx.rq.final_request.port) {
    return `${finalHost}:${ctx.rq.final_request.port}`;
  } else {
    return finalHost
  }
}

export const get_file_contents = (file_path) => {
  return fs.readFileSync(file_path, "utf-8");
}