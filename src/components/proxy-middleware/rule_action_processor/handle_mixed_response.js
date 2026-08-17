const axios = require("axios");
import fs from "fs";
import * as Sentry from "@sentry/browser";
const mime = require('mime-types');

const handleMixedResponse = async (ctx, destinationUrl) => {
  if (ctx.isSSL && destinationUrl.includes("http:")) {
    try {
      const resp = await axios.get(destinationUrl, {
        responseType: "arraybuffer", // never JSON-parse; binary-safe; axios still decompresses gzip
        headers: { "Cache-Control": "no-cache" },
      });
      return {
        status: true,
        response_data: {
          status_code: resp.status,
          headers: resp.headers, // real upstream headers (content-encoding already stripped by axios)
          body: resp.data,       // Buffer
        },
      };
    } catch (e) {
      Sentry.captureException(e);
      return {
        status: true,
        response_data: {
          headers: { "Cache-Control": "no-cache" },
          status_code: e.response ? e.response.status : 502,
          body: e.response ? e.response.data : null,
        },
      };
    }
  }

  if(destinationUrl?.startsWith("file://")) {
    const path = destinationUrl.slice(7)
    try {
      const buffers = fs.readFileSync(path);
      const mimeType = mime.lookup(path)
      const bodyContent = buffers.toString("utf-8") // assuming utf-8 encoding
      const headers = mimeType ? {
        "content-type": mimeType,
        "Content-Length": Buffer.byteLength(bodyContent),
        "Cache-Control": "no-cache"
      } : {
        "Cache-Control": "no-cache"
      }

      headers["access-control-allow-origin"] = "*";
      headers["access-control-allow-credentials"] = "true";
      headers["access-control-allow-methods"] = "*";
      headers["access-control-allow-headers"] = "*";

      return {
        status: true,
        response_data: {
          headers,
          status_code: 200,
          body: buffers.toString("utf-8"), // assuming utf-8 encoding
        },
      };
    } catch (err) {
      Sentry.captureException(err);
      // log for live debugging
      console.log("error in openning local file", err)
        return {
          status: true,
          response_data: {
            headers: { "Cache-Control": "no-cache" },
            status_code: 502,
            body: err?.message,
          },
        };
    }
  }
  return { status: false };
};

export default handleMixedResponse;
