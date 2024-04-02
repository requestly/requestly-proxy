import { PROXY_HANDLER_TYPE } from "../../../../lib/proxy";

import {
  CONSTANTS as GLOBAL_CONSTANTS,
} from "@requestly/requestly-core";
import {
  isResponseHTML,
  parseDOMToString,
  parseStringToDOM,
} from "../../helpers/response_helper";
import { build_action_processor_response } from "../utils";

const process_insert_action = (action, ctx) => {
  const allowed_handlers = [PROXY_HANDLER_TYPE.ON_RESPONSE_END];

  if (!allowed_handlers.includes(ctx.currentHandler)) {
    return build_action_processor_response(action, false);
  }

  const success = insert_scripts(ctx, action);
  return build_action_processor_response(action, success);
};

const modify_response = (ctx, new_resp) => {
  ctx.rq_response_body = new_resp;
};

const insert_scripts = (ctx, action) => {
  if (isResponseHTML(ctx)) {
    const fullResponseBodyString = ctx.rq_response_body;

    // Double check to ensure content is HTML
    if (/<\/?[a-z][\s\S]*>/i.test(fullResponseBodyString)) {
      // Parse Response body (string) to DOM
      let incomingDOM = parseStringToDOM(fullResponseBodyString);

      // Modify DOM to inject scripts
      handleCSSScripts(action.data.cssScripts, incomingDOM);
      handleJSLibraries(action.data.libraries, incomingDOM);
      handleJSScripts(action.data.jsScripts, incomingDOM);

      // Parse back DOM to String to forward client as response body
      const final_response_body = parseDOMToString(incomingDOM);
      modify_response(ctx, final_response_body);

      return true;
    }
  }
  return false;
};

/**
 * Handles all CSS Scripts
 */
const handleCSSScripts = (cssScripts, incomingDOM) => {
  cssScripts.forEach((script) => {
    includeCSS(script, incomingDOM);
  });
};

/**
 * Prepares to inject a CSS Scripts
 * @returns {string} HTML Content
 */
const includeCSS = (script, incomingDOM) => {
  if (script.type === GLOBAL_CONSTANTS.SCRIPT_TYPES.URL) {
    addRemoteCSS(script.value, script.attributes, incomingDOM);
  } else if (script.type === GLOBAL_CONSTANTS.SCRIPT_TYPES.CODE) {
    embedCSS(script.value, script.attributes, incomingDOM);
  }
};

const addRemoteCSS = (src, attributes, incomingDOM) => {
  var link = incomingDOM.createElement("link");

  if (attributes) {
    attributes.forEach(({ name: attrName, value: attrVal }) => {
      link.setAttribute(attrName, attrVal ?? "");
    });
  } else {
    link.type = "text/css";
    link.rel = "stylesheet";
  }

  link.href = src;
  link.classList.add(getScriptClassAttribute());

  (incomingDOM.head || incomingDOM.documentElement).appendChild(link);
};

const getScriptClassAttribute = () => {
  return GLOBAL_CONSTANTS.PUBLIC_NAMESPACE + "SCRIPT";
};

const embedCSS = (css, attributes, incomingDOM) => {
  var style = incomingDOM.createElement("style");
  style.appendChild(incomingDOM.createTextNode(css));

  if (attributes) {
    attributes.forEach(({ name: attrName, value: attrVal }) => {
      style.setAttribute(attrName, attrVal ?? "");
    });
  }

  style.classList.add(getScriptClassAttribute());
  (incomingDOM.head || incomingDOM.documentElement).appendChild(style);
};

const handleJSLibraries = (libraries, incomingDOM) => {
  addLibraries(libraries, null, incomingDOM);
};

const addLibraries = (libraries, indexArg, incomingDOM) => {
  var index = indexArg || 0;

  if (index >= libraries.length) {
    return;
  }

  var libraryKey = libraries[index];
  var library = GLOBAL_CONSTANTS.SCRIPT_LIBRARIES[libraryKey];
  var addNextLibraries = () => {
    addLibraries(libraries, index + 1, incomingDOM);
  };

  if (library) {
    addRemoteJS(library.src, null, addNextLibraries, incomingDOM);
  } else {
    addNextLibraries();
  }
};

const addRemoteJS = (src, attributes, callback, incomingDOM) => {
  var script = incomingDOM.createElement("script");
  // NOT WORKING
  // if (typeof callback === "function") {
  // script.onload = callback
  // }
  if (attributes) {
    attributes.forEach(({ name: attrName, value: attrVal }) => {
      script.setAttribute(attrName, attrVal ?? "");
    });
  } else {
    script.type = "text/javascript";
  }

  script.src = src;
  script.classList.add(getScriptClassAttribute());
  (incomingDOM.head || incomingDOM.documentElement).appendChild(script);

  // HOTFIX
  callback();
};

const handleJSScripts = (jsScripts, incomingDOM) => {
  var prePageLoadScripts = [];
  var postPageLoadScripts = [];

  jsScripts.forEach((script) => {
    if (
      script.loadTime === GLOBAL_CONSTANTS.SCRIPT_LOAD_TIME.BEFORE_PAGE_LOAD
    ) {
      prePageLoadScripts.push(script);
    } else {
      postPageLoadScripts.push(script);
    }
  });

  includeJSScriptsInOrder(
    prePageLoadScripts,
    () => {
      includeJSScriptsInOrder(postPageLoadScripts, null, null, incomingDOM);
    },
    null,
    incomingDOM
  );
};

const includeJSScriptsInOrder = (scripts, callback, indexArg, incomingDOM) => {
  var index = indexArg || 0;

  if (index >= scripts.length) {
    typeof callback === "function" && callback();
    return;
  }

  includeJS(
    scripts[index],
    () => {
      includeJSScriptsInOrder(scripts, callback, index + 1, incomingDOM);
    },
    incomingDOM
  );
};

const includeJS = (script, callback, incomingDOM) => {
  if (script.type === GLOBAL_CONSTANTS.SCRIPT_TYPES.URL) {
    addRemoteJS(script.value, script.attributes, callback, incomingDOM);
    return;
  }

  if (script.type === GLOBAL_CONSTANTS.SCRIPT_TYPES.CODE) {
    executeJS(script.value, script.attributes, incomingDOM);
  }

  typeof callback === "function" && callback();
};

const executeJS = (code, attributes, incomingDOM) => {
  const script = incomingDOM.createElement("script");

  if (attributes) {
    attributes.forEach(({ name: attrName, value: attrVal }) => {
      script.setAttribute(attrName, attrVal ?? "");
    });
  } else {
    script.type = "text/javascript";
  }

  script.classList.add(getScriptClassAttribute());

  script.appendChild(incomingDOM.createTextNode(code));
  const parent = incomingDOM.head || incomingDOM.documentElement;
  parent.appendChild(script);
};

export default process_insert_action;
