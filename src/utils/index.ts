export const getFunctionFromString = function (functionStringEscaped) {
    return new Function("return " + functionStringEscaped)();
};
