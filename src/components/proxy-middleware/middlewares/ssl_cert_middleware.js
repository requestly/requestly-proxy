const fs = require("fs");

class SslCertMiddleware {
  constructor(is_active, rootCertPath) {
    this.is_active = is_active;
    this.rootCertPath = rootCertPath;
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
      const certificateString = fs.readFileSync(this.rootCertPath);
      ctx.proxyToClientResponse.end(certificateString);
    }
  };
}

export default SslCertMiddleware;
