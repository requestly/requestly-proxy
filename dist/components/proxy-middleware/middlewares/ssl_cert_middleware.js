"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
class SslCertMiddleware {
    constructor(is_active, rootCertPath) {
        this.on_request = (ctx) => __awaiter(this, void 0, void 0, function* () {
            if (!this.is_active) {
                return true;
            }
            if (ctx.clientToProxyRequest.headers.host == "requestly.io" &&
                ctx.clientToProxyRequest.url.indexOf("/ssl") == 0) {
                ctx.proxyToClientResponse.writeHead(200, {
                    "Content-Type": "text/plain",
                    "Content-Disposition": "attachment;filename=RequestlyCA.pem.crt",
                });
                const certificateString = fs.readFileSync(this.rootCertPath);
                ctx.proxyToClientResponse.end(certificateString);
            }
        });
        this.is_active = is_active;
        this.rootCertPath = rootCertPath;
    }
}
exports.default = SslCertMiddleware;
