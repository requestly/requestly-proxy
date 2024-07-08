"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJsonBody = exports.getContentType = exports.bodyParser = exports.getEncoding = void 0;
const charset_1 = __importDefault(require("charset"));
const mime_types_1 = __importDefault(require("mime-types"));
const getEncoding = (contentTypeHeader, buffer) => {
    const encoding = (0, charset_1.default)(contentTypeHeader, buffer) || mime_types_1.default.charset(contentTypeHeader) || "utf8";
    return encoding;
};
exports.getEncoding = getEncoding;
const bodyParser = (contentTypeHeader, buffer) => {
    const encoding = (0, exports.getEncoding)(contentTypeHeader, buffer);
    try {
        return buffer.toString(encoding);
    }
    catch (error) {
        // some encodings are not supposed to be turned into string
        return buffer;
    }
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
