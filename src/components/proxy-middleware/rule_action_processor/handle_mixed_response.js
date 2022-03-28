const axios = require("axios");
const parser = require("ua-parser-js");
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
  return { status: false };
};

export default handleMixedResponse;
