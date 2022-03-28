export const RULE_ACTION = {
  REDIRECT: "redirect",
  MODIFY_HEADERS: "modify_headers",
  MODIFY_USER_AGENT: "modify_user_agent",
  BLOCK: "block",
  INSERT: "insert",
  DELAY: "add_delay",
  MODIFY_RESPONSE: "modify_response",
};

export const RQ_INTERCEPTED_CONTENT_TYPES = [
  "text/html",
  "text/javascript",
  "application/javascript",
  "text/css",
  "application/css",
  "application/json",
];
