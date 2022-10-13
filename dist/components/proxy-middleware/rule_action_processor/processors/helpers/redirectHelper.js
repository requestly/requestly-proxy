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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleServerSideRedirect = exports.handleMixedResponse = void 0;
const parser = require("ua-parser-js");
const Sentry = __importStar(require("@sentry/browser"));
const https_1 = __importDefault(require("https"));
function makeSameRequestToDifferentUrl(ctx, url) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const requestOptions = {
                headers: Object.assign(Object.assign({}, (_a = ctx === null || ctx === void 0 ? void 0 : ctx.clientToProxyRequest) === null || _a === void 0 ? void 0 : _a.headers), { "Cache-Control": "no-cache" }),
                rejectUnauthorized: false,
                requestCert: true,
                agent: false,
                strictSSL: false,
            };
            const { data, response } = yield new Promise((resolve, reject) => {
                let request = https_1.default.get(url, requestOptions, (res) => {
                    const dataBuffers = [];
                    res.on('data', (buffer) => {
                        dataBuffers.push(buffer);
                    });
                    res.on('end', () => {
                        resolve({ data: Buffer.concat(dataBuffers).toString(), response: res });
                    });
                });
                request.on('error', (error) => {
                    console.error(error);
                    reject(error);
                });
            });
            return { success: true, response, data };
        }
        catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return { success: false, error };
        }
    });
}
const willCreateMixedResponse = (ctx, destinationUrl) => {
    var _a, _b, _c, _d;
    let user_agent_str = null;
    user_agent_str = (_a = ctx === null || ctx === void 0 ? void 0 : ctx.clientToProxyRequest) === null || _a === void 0 ? void 0 : _a.headers["user-agent"];
    console.log("handling mixed response. i got headers", (_b = ctx === null || ctx === void 0 ? void 0 : ctx.clientToProxyRequest) === null || _b === void 0 ? void 0 : _b.headers);
    const user_agent = (_d = (_c = parser(user_agent_str)) === null || _c === void 0 ? void 0 : _c.browser) === null || _d === void 0 ? void 0 : _d.name;
    const LOCAL_DOMAINS = ["localhost", "127.0.0.1"];
    return ctx.isSSL && (user_agent === "Safari" ||
        !LOCAL_DOMAINS.some((domain) => destinationUrl.includes(domain)));
};
const handleMixedResponse = (ctx, destinationUrl) => __awaiter(void 0, void 0, void 0, function* () {
    if (willCreateMixedResponse(ctx, destinationUrl)) {
        const { success, error, response, data } = yield makeSameRequestToDifferentUrl(ctx, destinationUrl);
        if (success) {
            return {
                status: true,
                response_data: {
                    headers: Object.assign(Object.assign({}, response.headers), { "connection": "close", "Cache-Control": "no-cache" }),
                    status_code: response.statuscode,
                    body: data,
                },
            };
        }
        else {
            return {
                status: true,
                response_data: {
                    headers: { "Cache-Control": "no-cache" },
                    status_code: 502,
                    body: error.response ? error.responserror.data : null,
                },
            };
        }
    }
    return { status: false };
});
exports.handleMixedResponse = handleMixedResponse;
const canMakeServerSideRedirect = (ctx, destinationUrl) => {
    // todo: no redirects for html documents
    // content-type
    // will be handled by mixed content case
    if (destinationUrl.includes("http"))
        return false;
    return true;
};
const handleServerSideRedirect = (ctx, destinationUrl) => __awaiter(void 0, void 0, void 0, function* () {
    if (canMakeServerSideRedirect(ctx, destinationUrl)) {
        const { success, error, response, data } = yield makeSameRequestToDifferentUrl(ctx, destinationUrl);
        if (success) {
            return {
                status: true,
                response_data: {
                    headers: Object.assign(Object.assign({}, response.headers), { "connection": "close", "Cache-Control": "no-cache" }),
                    status_code: response.statuscode,
                    body: data,
                },
            };
        }
        else {
            return {
                status: true,
                response_data: {
                    headers: { "Cache-Control": "no-cache" },
                    status_code: 502,
                    body: error.response ? error.responserror.data : null,
                },
            };
        }
    }
    return { status: false };
});
exports.handleServerSideRedirect = handleServerSideRedirect;
// export default handleMixedResponse; // change exports
