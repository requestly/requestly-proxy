"use strict";
// Synthesizes a "Success" page for amiusing.requestly.io entirely inside the
// proxy, without forwarding upstream. This proves to the user that traffic is
// flowing through the Requestly desktop proxy, regardless of what the origin
// at amiusing.requestly.io is currently serving.
//
// Runs as a pre-rules middleware (registered via init_amiusing_handler), so it
// short-circuits before the rule engine is consulted — the same pattern
// ssl_cert_middleware uses for /ssl certificate downloads.
Object.defineProperty(exports, "__esModule", { value: true });
const amiusing_yes_page_1 = require("./amiusing_yes_page");
const AMIUSING_HOST = "amiusing.requestly.io";
class AmisuingMiddleware {
    constructor(is_active) {
        this.on_request = async (ctx) => {
            if (!this.is_active) {
                return true;
            }
            if (ctx.proxyToServerRequestOptions.host !== AMIUSING_HOST) {
                return;
            }
            ctx.proxyToClientResponse.writeHead(200, {
                "Content-Type": "text/html",
                "Cache-Control": "no-store",
            });
            ctx.proxyToClientResponse.end(amiusing_yes_page_1.AMIUSING_YES_HTML);
        };
        this.is_active = is_active;
    }
}
exports.default = AmisuingMiddleware;
