const fs = require("fs");

import { staticConfig } from "../../../../renderer/config";

const { ROOT_CERT_PATH } = staticConfig;

class SslCertMiddleware {
  constructor(is_active) {
    this.is_active = is_active;
  }

  on_request = async (ctx) => {
    if (!this.is_active) {
      return true;
    }

    if (
      ctx.clientToProxyRequest.headers.host == "requestly.io" &&
      ctx.clientToProxyRequest.url.indexOf("/ssl") == 0
    ) {
      ctx.proxyToClientResponse.writeHead(200, {
        "Content-Type": "text/plain",
        "Content-Disposition": "attachment;filename=RequestlyCA.pem.crt",
      });
      const certificateString = fs.readFileSync(ROOT_CERT_PATH);
      ctx.proxyToClientResponse.end(certificateString);
    }
  };
}

export default SslCertMiddleware;
