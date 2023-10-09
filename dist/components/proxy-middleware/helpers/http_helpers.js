"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJsonBody = exports.getContentType = exports.bodyParser = void 0;
const charset_1 = __importDefault(require("charset"));
const mime_types_1 = __importDefault(require("mime-types"));
const bodyParser = (contentTypeHeader, buffer) => {
    let inherentEncoding = (0, charset_1.default)(contentTypeHeader) || mime_types_1.default.charset(contentTypeHeader);
    let str_buffer = null;
    const isEncodingValid = (givenEncoding) => givenEncoding && Buffer.isEncoding(givenEncoding);
    const setBufferString = (givenEncoding) => (str_buffer = buffer.toString(givenEncoding));
    if (isEncodingValid(inherentEncoding)) {
        setBufferString(inherentEncoding);
    }
    else {
        const mostCommonEncodings = [
            "utf8",
            "utf16le",
            "ascii",
            "ucs2",
            "base64",
            "latin1",
            "binary",
            "hex",
        ];
        mostCommonEncodings.every((newPossibleEncoding) => {
            if (isEncodingValid(newPossibleEncoding)) {
                setBufferString(newPossibleEncoding);
                return false;
            }
        });
    }
    return str_buffer;
    /*
     FOLLOWING IS HOW API CLIENT PARSES THE BODY
     much simpler than above, but requires thorough testing
    */
    // // todo: add support for other content types
    // let parsedResponse;
    // if (contentTypeHeader?.includes("image/")) {
    //   const raw = Buffer.from(buffer).toString("base64");
    //   parsedResponse = `data:${contentTypeHeader};base64,${raw}`;
    // } else {
    //   parsedResponse = new TextDecoder().decode(buffer);
    // }
    // return parsedResponse;
};
exports.bodyParser = bodyParser;
const getContentType = (contentTypeHeader) => {
    var _a;
    return (_a = contentTypeHeader === null || contentTypeHeader === void 0 ? void 0 : contentTypeHeader.split(";")[0]) !== null && _a !== void 0 ? _a : null;
};
exports.getContentType = getContentType;
const parseJsonBody = (data) => {
    try {
        return JSON.parse(data);
    }
    catch (e) {
        /* Body is still buffer array */
    }
    return data;
};
exports.parseJsonBody = parseJsonBody;
