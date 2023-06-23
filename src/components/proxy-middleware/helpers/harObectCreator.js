const createHarHeaders = (request_headers_obj) => {
  // convert headers obj to haar format
  const headers = [];
  if (request_headers_obj) {
    for (const key in request_headers_obj) {
      headers.push({
        name: key,
        value: request_headers_obj[key],
      });
    }
  }
  return headers;
};

const createHarQueryStrings = (query_params) => {
  let res = []

  Object.keys(query_params).forEach(query => {
    const query_value = query_params[query]
    if(Array.isArray(query_value)) {
      query_value.forEach(val => {
        res.push({
          "name" : query,
          "value": val
        })
      })
    } else {
      res.push({
        "name" : query,
        "value": query_value
      })
    }
  })

  return res
};

const getContentType = (headers) => {
  let contentType = null;
  if (headers) {
    headers.forEach((item) => {
      if (item.name === "content-type") {
        contentType = item.value;
      }
    });
  }
  return contentType;
};

const buildHarPostParams = (contentType, body) => {
  if (contentType === "application/x-www-form-urlencoded") {
    return body
      .split("&") // Split by separators
      .map((keyValue) => {
        const [key, value] = keyValue.split("=");
        return {
          name: key,
          value,
        };
      });
  } else {
    // FormData has its own format
    // TODO Complete form data case -> where file is uploaded
    return {
      name: contentType,
      value: body,
    };
  }
};

const createHarPostData = (body, headers) => {
  // http://www.softwareishard.com/blog/har-12-spec/#postData
  if (!body) {
    return undefined;
  }

  const contentType = getContentType(headers);
  // if (!contentType) {
  //   return undefined;
  // }
  // // console.log("contentType and Body", { contentType, body }, typeof body);
  // if (
  //   ["application/x-www-form-urlencoded", "multipart/form-data"].includes(
  //     contentType
  //   )
  // ) {
  //   return {
  //     mimeType: contentType,
  //     params: buildHarPostParams(contentType, body),
  //   };
  // }
  return {
    mimeType: contentType, // Let's assume by default content type is JSON
    text: body,
  };
};

// create standard request har object: http://www.softwareishard.com/blog/har-12-spec/#request
// URL: https://github.com/hoppscotch/hoppscotch/blob/75ab7fdb00c0129ad42d45165bd3ad0af1faca2e/packages/hoppscotch-app/helpers/new-codegen/har.ts#L26
export const createRequestHarObject = (
  requestHarObject,
  proxyToServerRequestOptions
) => {
  const {
    method,
    host,
    path,
    body,
    headers,
    agent,
    query_params
  } = proxyToServerRequestOptions;

  return {
    bodySize: -1, // TODO: calculate the body size
    headersSize: -1, // TODO: calculate the header size
    httpVersion: "HTTP/1.1",
    cookies: [], // TODO: add support for Cookies
    headers: requestHarObject.headers || createHarHeaders(headers),
    method: requestHarObject.method || method,
    queryString: requestHarObject.queryString || createHarQueryStrings(query_params),
    url:
      requestHarObject.url || (agent?.protocol || "http:") + "//" + host + path,
    postData:
      requestHarObject.postData ||
      createHarPostData(body, requestHarObject.headers),
  };
};


export const createHar = (requestHeaders, method, protocol, host, path, requestBody, responseStatusCode, response, responseHeaders, requestParams) => {
  return {
    "log": {
      "version" : "1.2",
      "creator" : {},
      "browser" : {},
      "pages": [],
      "entries": [createHarEntry(requestHeaders, method, protocol, host, path, requestBody, responseStatusCode, response, responseHeaders, requestParams)],
      "comment": ""
    }
  };
}

export const createHarEntry = (requestHeaders, method, protocol, host, path, requestBody, responseStatusCode, response, responseHeaders, requestParams) => {
  return {
      // "pageref": "page_0",
      "startedDateTime": new Date().toISOString(),
      // "time": 50,
      "request": createHarRequest(requestHeaders, method, protocol, host, path, requestBody, requestParams),
      "response": createHarResponse(responseStatusCode, response, responseHeaders),
      "cache": {},
      "timings": {},
      // "serverIPAddress": "10.0.0.1",
      // "connection": "52492",
      "comment": ""
  };
}

export const createHarRequest = (requestHeaders, method, protocol, host, path, requestBody, requestParams) => {
  return {
    bodySize: -1, // TODO: calculate the body size
    headersSize: -1, // TODO: calculate the header size
    httpVersion: "HTTP/1.1",
    cookies: [], // TODO: add support for Cookies
    headers: createHarHeaders(requestHeaders),
    method: method,
    queryString: createHarQueryStrings(requestParams),
    url:
      protocol + "://" + host + path,
    postData:
      createHarPostData(requestBody, createHarHeaders(requestHeaders)),
  };
}

export const createHarResponse = (responseStatusCode, response, responseHeaders) => {
  return {
    "status": responseStatusCode,
    // "statusText": "OK",
    "httpVersion": "HTTP/1.1",
    "cookies": [],
    "headers": createHarHeaders(responseHeaders),
    "content": {
      "size": 33,
      "compression": 0,
      "mimeType": (responseHeaders && responseHeaders["content-type"]),
      "text": response,
      "comment": ""
    },
    // "redirectURL": "",
    "headersSize" : -1,
    "bodySize" : -1,
    "comment" : ""
  };
}
