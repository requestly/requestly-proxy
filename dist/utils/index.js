"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFunctionFromString = void 0;
const getFunctionFromString = function (functionStringEscaped) {
    return new Function("return " + functionStringEscaped)();
};
exports.getFunctionFromString = getFunctionFromString;
