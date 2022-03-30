"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDOMToString = exports.parseStringToDOM = exports.isResponseHTML = void 0;
const isResponseHTML = (ctx) => {
    return (ctx.serverToProxyResponse.headers["content-type"] &&
        ctx.serverToProxyResponse.headers["content-type"].indexOf("text/html") === 0);
};
exports.isResponseHTML = isResponseHTML;
const parseStringToDOM = (string) => {
    return new DOMParser().parseFromString(string, "text/html");
};
exports.parseStringToDOM = parseStringToDOM;
const parseDOMToString = (DOM) => {
    return DOM.documentElement.outerHTML;
    // return new XMLSerializer().serializeToString(DOM);
};
exports.parseDOMToString = parseDOMToString;
