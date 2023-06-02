export const isResponseHTML = (ctx) => {
  return (
    ctx.serverToProxyResponse.headers["content-type"] &&
    ctx.serverToProxyResponse.headers["content-type"].indexOf("text/html") === 0
  );
};

export const parseStringToDOM = (string) => {
  return new DOMParser().parseFromString(string, "text/html");
};

export const parseDOMToString = (DOM) => {
  return DOM.documentElement.outerHTML;
  // return new XMLSerializer().serializeToString(DOM);
};