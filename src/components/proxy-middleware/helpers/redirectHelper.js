const parser = require("ua-parser-js");
import * as Sentry from "@sentry/browser";
import https from "https"
import http from "http"

const willCreateMixedResponseThatCanBeHandled = (ctx , destinationUrl) => {
  let user_agent_str = null;
  user_agent_str = ctx?.clientToProxyRequest?.headers["user-agent"];
  const user_agent = parser(user_agent_str)?.browser?.name;
  const LOCAL_DOMAINS = ["localhost", "127.0.0.1"];

  return ctx.isSSL && destinationUrl.includes("http:") && (
    user_agent === "Safari" ||
    !LOCAL_DOMAINS.some((domain) => destinationUrl.includes(domain))
  )
}

const canPreserveCookie = (ctx, destinationUrl) => {
  /* DOES NOT WORK */
  // CAN'T DIFFERENTIATE CALL TO TOP LEVEL DOCUMENT

  // // had to create this because host and referer were sometimes same 
  // // but had additional prefixes like `/`
  // // note: neither referer nor host have search params
  // const areUrlsSame = (u1, u2) => {
  //   try {
  //     let u1obj = new URL(u1)
  //     let u2obj = new URL(u2)  
  //     return u1obj.href === u2obj.href
  //   } catch {
  //     // when url objects were not properly formed
  //     return false
  //   }
  // }

  // const requestHeaders = ctx?.clientToProxyRequest?.headers;
  // const referer = requestHeaders["referer"] || requestHeaders["Referer"]
  // const origin = requestHeaders["origin"] || requestHeaders["Origin"]

  // // cannot preserve cookie on request for toplevel document
  // if (
  //   // navigating to the domain directly from the search bar
  //   !referer || 
  //   // when navigating using google search result
  //   // referrer is present but origin is not
  //   !origin || // bug: origin not passed by firefox in some cases
  //   !areUrlsSame(referer, origin) 
  // ) return false 
  return true
}

export const shouldMakeExternalRequest = (ctx, action) => {
  return (
    (action.preserveCookie && canPreserveCookie(ctx, action.url)) ||
    willCreateMixedResponseThatCanBeHandled(ctx, action.url)
  )
}

async function makeRequest(requestOptions) {
  let requestAgent = http
  if(requestOptions.url.includes("https")) requestAgent = https

  requestOptions.headers["Cache-Control"] = "no-cache"
  try { 
    const {data, response} = await new Promise ((resolve, reject) => {
      // `.request` wasn't working well with the provided request options
      // node only provides wrapper for get, hence did not implement other methods
      if(requestOptions.method === "GET") {
        let request = requestAgent.get(requestOptions.url, requestOptions, (res) => {
          const dataBuffers = []
        
          res.on('data', (buffer) => {
            dataBuffers.push(buffer)
          });
        
          res.on('end', () => {
            resolve({data: Buffer.concat(dataBuffers).toString(), response: res})
          });
        })

        request.on('error', (error) => {
          console.log("requestError", requestOptions);
          console.error(error);
          reject(error)
        });
      } else {
        // hack: to return an understandable response back to user
        // @nsr fix: implement all other methods using some workaround of http.request bug
        const errMsg = "Can only preserve cookies for get requests"
        const customError = new Error(errMsg)
        customError.response = {data: errMsg}
        throw customError
      }
    })

    return {success: true, response, data}
  } catch (error) {
    Sentry.captureException(error);
    console.error(error)
    return {success: false, error}
  }
}

export const makeExternalRequest = async (ctx, url) => {
  const requestOptions = ctx.proxyToServerRequestOptions

  // can't pass all request options because they o
  // verride some attrubutes of node http request options 
  // in the wrong way
  let finalRequestOptions = { 
    headers: {...requestOptions.headers}, 
    url, 
    method: requestOptions.method
  }
  if(url.includes("https")) {
    finalRequestOptions = {
      ...finalRequestOptions,
      rejectUnauthorized: false,
      requestCert: true,
      agent: false,
      strictSSL: false,
    }
  }

  const {success, error, response, data} =  await makeRequest(finalRequestOptions)

  if(success) {
    return {
      status: true,
      responseData: {
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
      responseData: {
        headers: { "Cache-Control": "no-cache" },
        status_code: 502,
        body: error.response ? error.response.data : null,
      },
    };
  }
}