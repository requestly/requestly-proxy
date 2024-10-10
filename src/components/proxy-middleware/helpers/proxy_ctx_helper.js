import { 
  CONSTANTS as GLOBAL_CONSTANTS,
} from "@requestly/requestly-core"


function extractUrlComponent(url, name) { // need this in proxy
  const myUrl = new URL(url);

  switch (name) {
    case GLOBAL_CONSTANTS.URL_COMPONENTS.URL:
      return url;
    case GLOBAL_CONSTANTS.URL_COMPONENTS.PROTOCOL:
      return myUrl.protocol;
    case GLOBAL_CONSTANTS.URL_COMPONENTS.HOST:
      return myUrl.host;
    case GLOBAL_CONSTANTS.URL_COMPONENTS.PATH:
      return myUrl.pathname;
    case GLOBAL_CONSTANTS.URL_COMPONENTS.QUERY:
      return myUrl.search;
    case GLOBAL_CONSTANTS.URL_COMPONENTS.HASH:
      return myUrl.hash;
  }

  console.error("Invalid source key", url, name);
}

/**
 *
 * @param queryString e.g. ?a=1&b=2 or a=1 or ''
 * @returns object { paramName -> [value1, value2] }
 */
export function getQueryParamsMap(queryString) {
  var map = {},
    queryParams;

  if (!queryString || queryString === "?") {
    return map;
  }

  if (queryString[0] === "?") {
    queryString = queryString.substr(1);
  }

  queryParams = queryString.split("&");

  queryParams.forEach(function (queryParam) {
    var paramName = queryParam.split("=")[0],
      paramValue = queryParam.split("=")[1];

    // We are keeping value of param as array so that in future we can support multiple param values of same name
    // And we do not want to lose the params if url already contains multiple params of same name
    map[paramName] = map[paramName] || [];
    map[paramName].push(paramValue);
  });

  return map;
}


export const get_request_url = (ctx) => {
  return (
    (ctx.isSSL ? "https://" : "http://") +
    ctx.clientToProxyRequest.headers.host +
    ctx.clientToProxyRequest.url
  );
};

export const get_original_request_headers = (ctx) => {
  // TODO: This needs to be fetched from ctx.clientToProxy headers
  return ctx.proxyToServerRequestOptions.headers;
};

export const get_original_response_headers = (ctx) => {
  // TODO: This needs to be fetched from ctx.clientToProxy headers
  return ctx?.serverToProxyResponse?.headers || {};
};

export const is_request_preflight = (ctx) => {
  if (
    // Request method is OPTIONS
    ctx.clientToProxyRequest.method.toLowerCase() === "options" &&
    // Has "origin" or "Origin" or "ORIGIN" header
    (ctx.clientToProxyRequest.headers["Origin"] ||
      ctx.clientToProxyRequest.headers["origin"] ||
      ctx.clientToProxyRequest.headers["ORIGIN"]) &&
    // Has Access-Control-Request-Method header
    (ctx.clientToProxyRequest.headers["Access-Control-Request-Method"] ||
      ctx.clientToProxyRequest.headers["access-control-request-method"] ||
      ctx.clientToProxyRequest.headers["ACCESS-CONTROL-REQUEST-METHOD"])
  )
    return true;
  else return false;
};

export const get_response_options = (ctx) => {
  const options = {};

  options.status_code = ctx.serverToProxyResponse.statusCode;
  options.headers = ctx.serverToProxyResponse.headers;

  return options;
};

export const get_request_options = (ctx) => {
  return {
    ...ctx.proxyToServerRequestOptions,
    query_params: get_json_query_params(ctx),
  };
};

export const get_json_query_params = (ctx) => {
  const url = get_request_url(ctx);
  let queryString = extractUrlComponent(url, GLOBAL_CONSTANTS.URL_COMPONENTS.QUERY);
  return getQueryParamsMap(queryString) || null;
};

export const getRequestHeaders = (ctx) => {
  if (ctx && ctx.proxyToServerRequestOptions) {
    return ctx.proxyToServerRequestOptions.headers || {};
  }

  return {};
};

export const getRequestContentTypeHeader = (ctx) => {
  return getRequestHeaders(ctx)["content-type"];
};

export const getResponseHeaders = (ctx) => {
  if (ctx && ctx.serverToProxyResponse) {
    return ctx.serverToProxyResponse.headers || {};
  }

  return {};
};

export const getResponseContentTypeHeader = (ctx) => {
  return getResponseHeaders(ctx)["content-type"];
};

export const getResponseStatusCode = (ctx) => {
  if (ctx && ctx.serverToProxyResponse) {
    return ctx.serverToProxyResponse.statusCode;
  }
};
