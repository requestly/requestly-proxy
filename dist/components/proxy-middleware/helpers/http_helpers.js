"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContentType = exports.bodyParser = void 0;
const charset_1 = __importDefault(require("charset"));
const mime_types_1 = __importDefault(require("mime-types"));
const bodyParser = (contentTypeHeader, buffer) => {
    const encoding = (0, charset_1.default)(contentTypeHeader) || mime_types_1.default.charset(contentTypeHeader);
    let str_buffer = null;
    if (encoding && Buffer.isEncoding(encoding)) {
        str_buffer = buffer.toString(encoding);
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
