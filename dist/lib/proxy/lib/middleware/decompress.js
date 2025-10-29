"use strict";
var zlib = require("zlib");
const decompressMiddleware = {
    onResponse: function (ctx, callback) {
        if (ctx.serverToProxyResponse.headers["content-encoding"] &&
            ctx.serverToProxyResponse.headers["content-encoding"].toLowerCase() ==
                "gzip") {
            delete ctx.serverToProxyResponse.headers["content-encoding"];
            ctx.addResponseFilter(zlib.createGunzip());
        }
        else if (ctx.serverToProxyResponse.headers["content-encoding"] &&
            ctx.serverToProxyResponse.headers["content-encoding"].toLowerCase() ==
                "br") {
            delete ctx.serverToProxyResponse.headers["content-encoding"];
            ctx.addResponseFilter(zlib.createBrotliDecompress());
        }
        return callback();
    },
    onRequest: function (ctx, callback) {
        ctx.proxyToServerRequestOptions.headers["accept-encoding"] = "gzip";
        return callback();
    },
};
module.exports = decompressMiddleware;
