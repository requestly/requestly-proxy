const parser = require("ua-parser-js");
import * as Sentry from "@sentry/browser";
const needle = require("needle")

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
  requestOptions.headers["cache-control"] = "no-cache"
  try { 
    if(requestOptions.method === "GET") {
      const req = needle.get(requestOptions.url, requestOptions)
      let dataBuffers = [];
      req.on('readable', () => { 
          let chunk;
          while (chunk = req.read()) {
            dataBuffers.push(chunk)
          }
        }
      );

      let respheaders, respstatus, response;
      req.on('header', function(statusCode, headers) {
        respheaders = headers
        respstatus = statusCode
      });

      const data = await new Promise((resolve, reject) => {
        req.on('done', (err, resp) => {
            response = resp
            if(err) reject(err)
            if(Buffer.isBuffer(dataBuffers[0])) {
              resolve(Buffer.concat(dataBuffers).toString())
            } else {
              resolve(JSON.stringify(dataBuffers[0]));
            }
        });
      });

      const responseMetadata = {
        headers: respheaders,
        statusCode:respstatus,
        res: response
      }
      
      return {success: true, response: responseMetadata, data}
    } else {
      // hack: to return an understandable response back to user
      // @nsr: implement all other methods 
      const errMsg = "Can only preserve cookies for get requests"
      const customError = new Error(errMsg)
      customError.response = {data: errMsg}
      throw customError
    }
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
        status_code: response.statusCode,
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