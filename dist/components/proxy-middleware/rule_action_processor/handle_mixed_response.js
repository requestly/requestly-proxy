"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios = require("axios");
const parser = require("ua-parser-js");
const fs_1 = __importDefault(require("fs"));
const Sentry = __importStar(require("@sentry/browser"));
const mime = require('mime-types');
const handleMixedResponse = async (ctx, destinationUrl) => {
    var _a, _b, _c;
    // Handling mixed response from safari
    let user_agent_str = null;
    user_agent_str = (_a = ctx === null || ctx === void 0 ? void 0 : ctx.clientToProxyRequest) === null || _a === void 0 ? void 0 : _a.headers["user-agent"];
    const user_agent = (_c = (_b = parser(user_agent_str)) === null || _b === void 0 ? void 0 : _b.browser) === null || _c === void 0 ? void 0 : _c.name;
    const LOCAL_DOMAINS = ["localhost", "127.0.0.1"];
    if (ctx.isSSL && destinationUrl.includes("http:")) {
        if (user_agent === "Safari" ||
            !LOCAL_DOMAINS.some((domain) => destinationUrl.includes(domain))) {
            try {
                const resp = await axios.get(destinationUrl, {
                    headers: {
                        "Cache-Control": "no-cache",
                    },
                });
                return {
                    status: true,
                    response_data: {
                        headers: { "Cache-Control": "no-cache" },
                        status_code: 200,
                        body: resp.data,
                    },
                };
            }
            catch (e) {
                Sentry.captureException(e);
                return {
                    status: true,
                    response_data: {
                        headers: { "Cache-Control": "no-cache" },
                        status_code: 502,
                        body: e.response ? e.response.data : null,
                    },
                };
            }
        }
    }
    if (destinationUrl === null || destinationUrl === void 0 ? void 0 : destinationUrl.startsWith("file://")) {
        const path = destinationUrl.slice(7);
        try {
            const buffers = fs_1.default.readFileSync(path);
            const mimeType = mime.lookup(path);
            const bodyContent = buffers.toString("utf-8"); // assuming utf-8 encoding
            const headers = mimeType ? {
                "content-type": mimeType,
                "Content-Length": Buffer.byteLength(bodyContent),
                "Cache-Control": "no-cache"
            } : {
                "Cache-Control": "no-cache"
            };
            headers["access-control-allow-origin"] = "*";
            headers["access-control-allow-credentials"] = "true";
            headers["access-control-allow-methods"] = "*";
            headers["access-control-allow-headers"] = "*";
            return {
                status: true,
                response_data: {
                    headers,
                    status_code: 200,
                    body: buffers.toString("utf-8"), // assuming utf-8 encoding
                },
            };
        }
        catch (err) {
            Sentry.captureException(err);
            // log for live debugging
            console.log("error in openning local file", err);
            return {
                status: true,
                response_data: {
                    headers: { "Cache-Control": "no-cache" },
                    status_code: 502,
                    body: err === null || err === void 0 ? void 0 : err.message,
                },
            };
        }
    }
    return { status: false };
};
exports.default = handleMixedResponse;
