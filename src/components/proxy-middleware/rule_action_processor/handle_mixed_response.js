const axios = require("axios");
const parser = require("ua-parser-js");
import fs from "fs";
import * as Sentry from "@sentry/browser";

const handleMixedResponse = async (ctx, destinationUrl) => {
  // Handling mixed response from safari
  let user_agent_str = null;
  user_agent_str = ctx?.clientToProxyRequest?.headers["user-agent"];
  const user_agent = parser(user_agent_str)?.browser?.name;
  const LOCAL_DOMAINS = ["localhost", "127.0.0.1"];

  if (ctx.isSSL && destinationUrl.includes("http:")) {
    if (
      user_agent === "Safari" ||
      !LOCAL_DOMAINS.some((domain) => destinationUrl.includes(domain))
    ) {
      try {
        const resp = await axios.get(destinationUrl, {
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        return {
          status: true,
          response_data: {
            headers: { "Cache-Control": "no-cache" },
            status_code: 200,
            body: resp.data,
          },
        };
      } catch (e) {
        Sentry.captureException(e);
        return {
          status: true,
          response_data: {
            headers: { "Cache-Control": "no-cache" },
            status_code: 502,
            body: e.response ? e.response.data : null,
          },
        };
      }
    }
  }

  if(destinationUrl?.startsWith("file://")) {
    console.log("original", destinationUrl)
    const path = destinationUrl.slice(7)
    console.log("filepath", path)
    try {
      // utf-8 is common assumption, but this introduces edge cases
      const data = fs.readFileSync(path, "utf-8"); 
      return {
        status: true,
        response_data: {
          headers: { "Cache-Control": "no-cache" },
          status_code: 200,
          body: data,
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
            body: err.response ? err.response.data : null,
          },
        };
    }
  }
  return { status: false };
};

export default handleMixedResponse;
