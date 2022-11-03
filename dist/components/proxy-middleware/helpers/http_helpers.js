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
};
exports.bodyParser = bodyParser;
const getContentType = (contentTypeHeader) => {
    if (!contentTypeHeader) {
        return null;
    }
    let contentType = null;
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
    contentType = contentTypeHeader.split(";")[0];
    return contentType;
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
