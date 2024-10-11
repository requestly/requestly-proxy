"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AmisuingMiddleware {
    constructor(is_active) {
        this.on_request = async (ctx) => {
            if (!this.is_active) {
                return true;
            }
            if (ctx.proxyToServerRequestOptions.host === "amiusing.requestly.io") {
                Object.assign(ctx.proxyToServerRequestOptions.headers, {
                    ["amiusingrequestly"]: "true",
                });
            }
        };
        this.is_active = is_active;
    }
}
exports.default = AmisuingMiddleware;
