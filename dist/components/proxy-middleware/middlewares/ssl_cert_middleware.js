"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
class SslCertMiddleware {
    constructor(is_active, rootCertPath) {
        this.on_request = async (ctx) => {
            if (!this.is_active) {
                return true;
            }
            if (ctx.clientToProxyRequest.headers.host == "requestly.io" &&
                ctx.clientToProxyRequest.url.indexOf("/ssl") == 0) {
                ctx.proxyToClientResponse.writeHead(200, {
                    "Content-Type": "application/x-x509-ca-cert",
                    "Content-Disposition": "attachment;filename=RQProxyCA.pem.crt",
                });
                const certificateString = fs.readFileSync(this.rootCertPath);
                ctx.proxyToClientResponse.end(certificateString);
            }
        };
        this.is_active = is_active;
        this.rootCertPath = rootCertPath;
    }
}
exports.default = SslCertMiddleware;
