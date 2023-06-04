export const RULE_ACTION = {
  REDIRECT: "redirect",
  MODIFY_HEADERS: "modify_headers",
  MODIFY_USER_AGENT: "modify_user_agent",
  BLOCK: "block",
  INSERT: "insert",
  DELAY: "add_delay",
  MODIFY_RESPONSE: "modify_response",
  MODIFY_REQUEST: "modify_request",
};

export const RQ_INTERCEPTED_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "text/css",
  "application/css",
  "application/json",
  "application/manifest+json"
];
