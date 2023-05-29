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


const jsonifyValidJSONString = (mightBeJSONString) => {
  if (typeof mightBeJSONString !== "string") {
    return mightBeJSONString;
  }

  try {
    return JSON.parse(mightBeJSONString);
  } catch (e) {
    /* Do Nothing. Unable to parse the param value */
  }

  return mightBeJSONString;
};

export const isJSONString = (data) => {
  const parsedJson = jsonifyValidJSONString(data);
  return parsedJson !== data; // if data is not a JSON, jsonifyValidJSONString() returns same value
};