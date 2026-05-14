// Synthesizes a "Success" page for amiusing.requestly.io entirely inside the
// proxy, without forwarding upstream. This proves to the user that traffic is
// flowing through the Requestly desktop proxy, regardless of what the origin
// at amiusing.requestly.io is currently serving.
//
// Runs as a pre-rules middleware (registered via init_amiusing_handler), so it
// short-circuits before the rule engine is consulted — the same pattern
// ssl_cert_middleware uses for /ssl certificate downloads.

import { AMIUSING_YES_HTML } from "./amiusing_yes_page";

const AMIUSING_HOST = "amiusing.requestly.io";

class AmisuingMiddleware {
  constructor(is_active) {
    this.is_active = is_active;
  }

  on_request = async (ctx) => {
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
    ctx.proxyToClientResponse.end(AMIUSING_YES_HTML);
  };
}

export default AmisuingMiddleware;
