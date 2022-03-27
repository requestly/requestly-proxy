import {
  extractUrlComponent,
  getQueryParamsMap,
} from "../../../../../../../common/components/utils/utils";
const CONSTANTS = require("../../../../../../../common/constants");

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
  return ctx.serverToProxyResponse.headers;
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
  let queryString = extractUrlComponent(url, CONSTANTS.URL_COMPONENTS.QUERY);
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
