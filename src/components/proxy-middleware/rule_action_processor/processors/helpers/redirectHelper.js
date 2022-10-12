const parser = require("ua-parser-js");
import * as Sentry from "@sentry/browser";
import https from "https"

async function makeSameRequestToDifferentUrl(ctx, url) {
  try {
    const requestOptions = {
      headers:{
        ...ctx?.clientToProxyRequest?.headers,
        "Cache-Control": "no-cache",
      },
      rejectUnauthorized: false,
      requestCert: true,
      agent: false,
      strictSSL: false,
    }
    const {data, response} = await new Promise ((resolve, reject) => {
      let request = https.get(url, requestOptions, (res) => {
        const dataBuffers = []
        res.on('data', (buffer) => {
          dataBuffers.push(buffer)
        });
        res.on('end', () => {
          resolve({data: Buffer.concat(dataBuffers).toString(), response: res})
        });
      })
      request.on('error', (error) => {
        console.error(error);
        reject(error)
      });
    })

    return {success: true, response, data}
  } catch (error) {
    Sentry.captureException(error);
    console.error(error)
    return {success: false, error}
  }
}

const willCreateMixedResponse = (ctx , destinationUrl) => {
  let user_agent_str = null;
  user_agent_str = ctx?.clientToProxyRequest?.headers["user-agent"];
  console.log("handling mixed response. i got headers",ctx?.clientToProxyRequest?.headers)
  const user_agent = parser(user_agent_str)?.browser?.name;
  const LOCAL_DOMAINS = ["localhost", "127.0.0.1"];

  return ctx.isSSL && (
    user_agent === "Safari" ||
    !LOCAL_DOMAINS.some((domain) => destinationUrl.includes(domain))
  )
}

export const handleMixedResponse = async (ctx, destinationUrl) => {
  if(willCreateMixedResponse(ctx, destinationUrl)) {
    const {success, error, response, data} =  await makeSameRequestToDifferentUrl(ctx, destinationUrl)
    if(success) {
      return {
        status: true,
        response_data: {
          headers: { 
            ...response.headers,
            "connection": "close",
            "Cache-Control": "no-cache" 
          },
          status_code: response.statuscode,
          body: data,
        },
      }
    } else {
      return {
        status: true,
        response_data: {
          headers: { "Cache-Control": "no-cache" },
          status_code: 502,
          body: error.response ? error.responserror.data : null,
        },
      };
    }
  }
  return { status: false };
};

const canMakeServerSideRedirect = (ctx, destinationUrl) => {
  // todo: no redirects for html documents
  return true
}

export const handleServerSideRedirect = async (ctx, destinationUrl) => {
  if(canMakeServerSideRedirect(ctx, destinationUrl)) {
    const {success, error, response, data} =  await makeSameRequestToDifferentUrl(ctx, destinationUrl)
    if(success) {
      return {
        status: true,
        response_data: {
          headers: { 
            ...response.headers,
            "connection": "close",
            "Cache-Control": "no-cache" 
          },
          status_code: response.statuscode,
          body: data,
        },
      }
    } else {
      return {
        status: true,
        response_data: {
          headers: { "Cache-Control": "no-cache" },
          status_code: 502,
          body: error.response ? error.responserror.data : null,
        },
      };
    }
  }
  return { status: false };
}

// export default handleMixedResponse; // change exports
