// redirect helper

const parser = require("ua-parser-js");
import * as Sentry from "@sentry/browser";
import https from "https"
import http from "http"
import { getFileType } from "./http_helpers";

const { URL } = require("url");


const willCreateMixedResponse = (ctx , destinationUrl) => {
  let user_agent_str = null;
  user_agent_str = ctx?.clientToProxyRequest?.headers["user-agent"];
  console.log("handling mixed response. i got headers",ctx?.clientToProxyRequest?.headers)
  const user_agent = parser(user_agent_str)?.browser?.name;
  const LOCAL_DOMAINS = ["localhost", "127.0.0.1"];

  return ctx.isSSL && destinationUrl.includes("http") && (
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
    return true
  return (
    (action.preserveCookie && canPreserveCookie(ctx, action.url)) ||
    willCreateMixedResponse(ctx, url)
  )
}

async function makeRequest(requestOptions) {
  const url = new URL(requestOptions.url)
  const urlOptions = {
    host: url.hostname,
    path: url.pathname,
    port: url.protocol === 'https:' ? 443 : 80
  }
  const finalRequestOptions = {...requestOptions, ...urlOptions}
  // let requestAgent = http
  // if(requestOptions.url.includes("https")) {
  //   requestAgent = https
  // }

  const proto = url.protocol === 'https:' ? https : http;

  finalRequestOptions?.headers["Cache-Control"] = "no-cache"
  delete finalRequestOptions?.headers["keep-alive"]
  // delete requestOptions?.headers["Keep-Alive"]
  delete finalRequestOptions?.headers["accept"]
  // delete requestOptions?.headers["Accept"]
  delete finalRequestOptions?.headers["referer"]
  // delete requestOptions?.headers["Referer"]

  delete finalRequestOptions.agent

  console.log("debug: final request options", finalRequestOptions)


  try { 
    const {data, response} = await new Promise ((resolve, reject) => {
      // `.request` wasn't working well with the provided request options
      // node only provides wrapper for get, hence did not implement other methods
      // console.log("debug: requestOptions", requestOptions)
      // if(requestOptions.method === "GET" || requestOptions.method === "HEAD") {
        // let request = requestAgent.get(requestOptions.url, requestOptions, (res) => {
        let request = proto.request(finalRequestOptions)
          // , (res) => {
          // const dataBuffers = []
          
          // res.on('error', (err) => {
          //     console.log("err, in callback", err)
          //     reject(err)
          // });

          // res.pause();

          // console.log("response headers", res.headers)

          // // res.headers["transfer-encoding"] = "chunked";
          // delete res.headers["transfer-encoding"];
          // delete res.headers["content-length"];
          // res.headers["connection"] = "close";

          // let serverCookie = res.headers["set-cookie"] 
          // if(serverCookie) {
          //   let newServerCookie = serverCookie?.map(cookie => cookie?.split(";").filter(attr => {
          //     let _attr = attr?.trim()?.toLowerCase()
          //     console.log(_attr)
          //     return !_attr?.includes("domain") && !_attr?.includes("secure")
          //   }).join(";")
          //   )
          //   console.log("new cookie", newServerCookie)
          //   res.headers["set-cookie"] = newServerCookie
          // }

          // delete res.headers["public-key-pins"]
          // delete res.headers["content-security-policy"]
          // delete res.headers["content-encoding"];

          // res.on('data', (buffer) => {
          //   dataBuffers.push(buffer)
          // });
        
          // res.on('end', async () => {

          //   const bufferArray = new Uint8Array(dataBuffers)

          //   console.log("content type header", res.headers["content-type"])
          //   const filetype = await getFileType(bufferArray)
          //   console.log("detected filetype",filetype)
          //   console.log(filetype)
          //   const body = Buffer.concat([bufferArray]).toString()
          //   console.log(body)

            
          //   // const customDataBody = "<h1>Testing string html</>"

          //   // res.headers["content-type"] = "text/html; utf-8"
          //   resolve({data: body, response: res})
          // });



          // res.resume()

        //   // console.log("idk, should work???")

        //   // return self._onResponseHeaders(ctx, (err) => {
        //   //   if (err) {
        //   //     return self._onError("ON_RESPONSEHEADERS_ERROR", ctx, err);
        //   //   }
        //   //   ctx.proxyToClientResponse.writeHead(
        //   //     servToProxyResp!.statusCode!,
        //   //     Proxy.filterAndCanonizeHeaders(servToProxyResp.headers)
        //   //   );
        //   //   // @ts-ignore
        //   //   ctx.responseFilters.push(new ProxyFinalResponseFilter(self, ctx));
        //   //   let prevResponsePipeElem = servToProxyResp;
        //   //   ctx.responseFilters.forEach((filter) => {
        //   //     filter.on(
        //   //       "error",
        //   //       self._onError.bind(self, "RESPONSE_FILTER_ERROR", ctx)
        //   //     );
        //   //     prevResponsePipeElem = prevResponsePipeElem.pipe(filter);
        //   //   });
        //   //   return servToProxyResp.resume();
        //   // });

        // })

        // request.on('error', (error) => {
        //   console.log("requestError", requestOptions);
        //   console.error(error);
        //   reject(error)
        // });

        // request.end();
      // } else {
      //   // hack: to return an understandable response back to user
      //   // @nsr fix: implement all other methods using some workaround of http.request bug
      //   const errMsg = "Can only preserve cookies for get requests"
      //   const customError = new Error(errMsg)
      //   customError.response = {data: errMsg}
      //   throw customError
      // }


      request.on("response", (res) => {

        const contentType = res.headers['content-type'];
        const charsetMatch = contentType.match(/charset=([\w-]+)/i);
        const charset = charsetMatch ? charsetMatch[1] : 'utf-8';


        res.on('error', (err) => {
          console.log("err, in callback", err)
          reject(err)
        });

        // res.pause();

        console.log("response headers", res.headers)

        // res.headers["transfer-encoding"] = "chunked";
        delete res.headers["transfer-encoding"];
        delete res.headers["Transfer-Encoding"];
        delete res.headers["content-length"];
        delete res.headers.etag;

        delete res.headers["public-key-pins"]
        delete res.headers["content-security-policy"]
        delete res.headers["content-encoding"];


        res.headers["connection"] = "close";

        let serverCookie = res.headers["set-cookie"] 
        if(serverCookie) {
          let newServerCookie = serverCookie?.map(cookie => cookie?.split(";").filter(attr => {
            let _attr = attr?.trim()?.toLowerCase()
            console.log(_attr)
            return !_attr?.includes("domain") && !_attr?.includes("secure")
          }).join(";")
          )
          console.log("new cookie", newServerCookie)
          res.headers["set-cookie"] = newServerCookie
        }

        

        // res.on('data', (buffer) => {
        //   dataBuffers.push(buffer)
        // });
      
        // res.on('end', async () => {

        //   const bufferArray = new Uint8Array(dataBuffers)

        //   console.log("content type header", res.headers["content-type"])
        //   const filetype = await getFileType(bufferArray)
        //   console.log("detected filetype",filetype)
        //   console.log(filetype)
        //   const body = Buffer.concat([bufferArray]).toString()
        //   console.log(body)

          
        //   // const customDataBody = "<h1>Testing string html</>"

        //   // res.headers["content-type"] = "text/html; utf-8"
        //   resolve({data: body, response: res})
        // });


        const chunks = [];

        let bufferArray, totalLength = 0;

        
        // /* suggested in case of http */
        // switch (res.headers['content-encoding']) {
        //   case 'br':
        //     res.pipe(zlib.createBrotliDecompress())
        //     break
        //   case 'gzip':
        //     res.pipe(zlib.createGunzip())
        //     break
        //   case 'deflate':
        //     res.pipe(zlib.createInflate())
        //     break
        //   default:
        //     delete res.headers["content-encoding"]
        //     break;
        //   }
          
        res
          .on('data', chunk => {
            chunks.push(chunk)
            totalLength += chunk.length;
          })
          .on('end', () => {
            bufferArray = Buffer.concat(chunks, totalLength); 
            console.log("debug: AI code",bufferArray);
            res.headers["content-length"] = bufferArray.length

            let result


            // const finalHandler = (err, uncompressed) => {
            //   if (err) {
            //     console.error('An error occurred during decompression:', err);
            //     // process.exitCode = 1;
            //     result = ""
            //   } else {
            //     result = uncompressed.toString(charset); // Convert buffer to string and log it
            //   }
            // }



            // switch (res.headers['content-encoding']) {
            //   case 'br':
            //     zlib.brotliDecompress(bufferArray, finalHandler)
            //     break
            //   case 'gzip':
            //     zlib.gunzip(bufferArray, finalHandler)
            //     break
            //   case 'deflate':
            //     zlib.inflate(bufferArray, finalHandler)
            //     break
            //   default:
            //     delete res.headers["content-encoding"]
            //     result = bufferArray.toString('utf-8')
            //     break;
            //   }

            result = bufferArray.toString(charset)
            console.log("final status code", res.statusCode)
            resolve({data: result, response: res})
          });
        // res.resume()

      })

      request.end();


    })



    return {success: true, response, data}
  } catch (error) {
    Sentry.captureException(error);
    console.log("some error")
    console.error(error)
    return {success: false, error}
  }
}

export const makeExternalRequest = async (ctx, url) => {
  // const requestOptions = {...ctx.proxyToServerRequestOptions}
  const originalRequest = ctx.clientToProxyRequest
  console.log("debug: original request", originalRequest)
  const originalheaders = originalRequest?.headers

  const newRequestOptions = {
    headers: originalheaders
  }

  console.log("debug: newRequestOptions", newRequestOptions)
  // delete requestOptions?.headers["host"]
  delete newRequestOptions?.headers["host"]

  // can't pass all request options because they o
  // verride some attrubutes of node http request options 
  // in the wrong way
//   let finalRequestOptions = { 
//     headers: {...requestOptions.headers}, 
//     url, 
//     method: requestOptions.method
//   }
//   if(url.includes("https")) {
//     finalRequestOptions = {
//       ...finalRequestOptions,
//       rejectUnauthorized: false, // this a serverside api conf, not for clients
//       requestCert: true,
//       agent: false,
//       strictSSL: false,
//     }
//   }

  // requestOptions.url = url
  newRequestOptions.url = url
  const {success, error, response, data} =  await makeRequest(newRequestOptions)
//   const {success, error, response, data} =  await makeRequestWithGOT(finalRequestOptions)
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