"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RQ_INTERCEPTED_CONTENT_TYPES_REGEX = exports.RQ_INTERCEPTED_CONTENT_TYPES = exports.RULE_ACTION = void 0;
exports.RULE_ACTION = {
    REDIRECT: "redirect",
    MODIFY_HEADERS: "modify_headers",
    MODIFY_USER_AGENT: "modify_user_agent",
    BLOCK: "block",
    INSERT: "insert",
    DELAY: "add_delay",
    MODIFY_RESPONSE: "modify_response",
    MODIFY_REQUEST: "modify_request",
};
exports.RQ_INTERCEPTED_CONTENT_TYPES = [
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
exports.RQ_INTERCEPTED_CONTENT_TYPES_REGEX = new RegExp([
    'text/html', // HTML documents
    'text/plain', // Plain text
    'text/javascript', // JavaScript files
    'application/javascript', // JavaScript (standard MIME)
    'application/x-javascript', // JavaScript (legacy)
    'text/css', // CSS files
    'application/css', // CSS (alternative)
    'application/json', // JSON data
    'application/.+\\+json', // JSON-based media types (including vendor-specific like application/vnd.*)
].join('|'), 'i');
// console.log(RQ_INTERCEPTED_CONTENT_TYPES_REGEX);
