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
exports.makeExternalRequest = exports.shouldMakeExternalRequest = void 0;
const parser = require("ua-parser-js");
const Sentry = __importStar(require("@sentry/browser"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
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
const canPreserveCookie = (ctx, destinationUrl) => {
    /* DOES NOT WORK */
    // CAN'T DIFFERENTIATE CALL TO TOP LEVEL DOCUMENT
    // // had to create this because host and referer were sometimes same 
    // // but had additional prefixes like `/`
    // // note: neither referer nor host have search params
    // const areUrlsSame = (u1, u2) => {
    //   try {
    //     let u1obj = new URL(u1)
    //     let u2obj = new URL(u2)  
    //     return u1obj.href === u2obj.href
    //   } catch {
    //     // when url objects were not properly formed
    //     return false
    //   }
    // }
    // const requestHeaders = ctx?.clientToProxyRequest?.headers;
    // const referer = requestHeaders["referer"] || requestHeaders["Referer"]
    // const origin = requestHeaders["origin"] || requestHeaders["Origin"]
    // // cannot preserve cookie on request for toplevel document
    // if (
    //   // navigating to the domain directly from the search bar
    //   !referer || 
    //   // when navigating using google search result
    //   // referrer is present but origin is not
    //   !origin || // bug: origin not passed by firefox in some cases
    //   !areUrlsSame(referer, origin) 
    // ) return false 
    return true;
};
const shouldMakeExternalRequest = (ctx, action) => {
    return ((action.preserveCookie && canPreserveCookie(ctx, action.url)) ||
        willCreateMixedResponse(ctx, url));
};
exports.shouldMakeExternalRequest = shouldMakeExternalRequest;
function makeRequest(requestOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        let requestAgent = http_1.default;
        if (requestOptions.url.includes("https"))
            requestAgent = https_1.default;
        requestOptions.headers["Cache-Control"] = "no-cache";
        try {
            const { data, response } = yield new Promise((resolve, reject) => {
                // `.request` wasn't working well with the provided request options
                // node only provides wrapper for get, hence did not implement other methods
                if (requestOptions.method === "GET") {
                    let request = requestAgent.get(requestOptions.url, requestOptions, (res) => {
                        const dataBuffers = [];
                        res.on('data', (buffer) => {
                            dataBuffers.push(buffer);
                        });
                        res.on('end', () => {
                            resolve({ data: Buffer.concat(dataBuffers).toString(), response: res });
                        });
                    });
                    request.on('error', (error) => {
                        console.log("requestError", requestOptions);
                        console.error(error);
                        reject(error);
                    });
                }
                else {
                    // hack: to return an understandable response back to user
                    // @nsr fix: implement all other methods using some workaround of http.request bug
                    const errMsg = "Can only preserve cookies for get requests";
                    const customError = new Error(errMsg);
                    customError.response = { data: errMsg };
                    throw customError;
                }
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
const makeExternalRequest = (ctx, url) => __awaiter(void 0, void 0, void 0, function* () {
    const requestOptions = ctx.proxyToServerRequestOptions;
    // can't pass all request options because they o
    // verride some attrubutes of node http request options 
    // in the wrong way
    let finalRequestOptions = {
        headers: Object.assign({}, requestOptions.headers),
        url,
        method: requestOptions.method
    };
    if (url.includes("https")) {
        finalRequestOptions = Object.assign(Object.assign({}, finalRequestOptions), { rejectUnauthorized: false, requestCert: true, agent: false, strictSSL: false });
    }
    const { success, error, response, data } = yield makeRequest(finalRequestOptions);
    if (success) {
        return {
            status: true,
            responseData: {
                headers: Object.assign(Object.assign({}, response.headers), { "connection": "close", "Cache-Control": "no-cache" }),
                status_code: response.statuscode,
                body: data,
            },
        };
    }
    else {
        return {
            status: true,
            responseData: {
                headers: { "Cache-Control": "no-cache" },
                status_code: 502,
                body: error.response ? error.response.data : null,
            },
        };
    }
});
exports.makeExternalRequest = makeExternalRequest;
