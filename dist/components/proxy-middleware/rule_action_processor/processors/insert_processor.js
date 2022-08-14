"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = require("../../../../lib/proxy");
const requestly_core_1 = require("@requestly/requestly-core");
const response_helper_1 = require("../../helpers/response_helper");
const utils_1 = require("../utils");
const process_insert_action = (action, ctx) => {
    const allowed_handlers = [proxy_1.PROXY_HANDLER_TYPE.ON_RESPONSE_END];
    if (!allowed_handlers.includes(ctx.currentHandler)) {
        return (0, utils_1.build_action_processor_response)(action, false);
    }
    const success = insert_scripts(ctx, action);
    return (0, utils_1.build_action_processor_response)(action, success);
};
const modify_response = (ctx, new_resp) => {
    ctx.rq_response_body = new_resp;
};
const insert_scripts = (ctx, action) => {
    if ((0, response_helper_1.isResponseHTML)(ctx)) {
        const fullResponseBodyString = ctx.rq_response_body;
        // Double check to ensure content is HTML
        if (/<\/?[a-z][\s\S]*>/i.test(fullResponseBodyString)) {
            // Parse Response body (string) to DOM
            let incomingDOM = (0, response_helper_1.parseStringToDOM)(fullResponseBodyString);
            // Modify DOM to inject scripts
            handleCSSScripts(action.data.cssScripts, incomingDOM);
            handleJSLibraries(action.data.libraries, incomingDOM);
            handleJSScripts(action.data.jsScripts, incomingDOM);
            // Parse back DOM to String to forward client as response body
            const final_response_body = (0, response_helper_1.parseDOMToString)(incomingDOM);
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
    if (script.type === requestly_core_1.CONSTANTS.SCRIPT_TYPES.URL) {
        addRemoteCSS(script.value, incomingDOM);
    }
    else if (script.type === requestly_core_1.CONSTANTS.SCRIPT_TYPES.CODE) {
        embedCSS(script.value, incomingDOM);
    }
};
const addRemoteCSS = (src, incomingDOM) => {
    var link = incomingDOM.createElement("link");
    link.href = src;
    link.type = "text/css";
    link.rel = "stylesheet";
    link.className = getScriptClassAttribute();
    (incomingDOM.head || incomingDOM.documentElement).appendChild(link);
};
const getScriptClassAttribute = () => {
    return requestly_core_1.CONSTANTS.PUBLIC_NAMESPACE + "SCRIPT";
};
const embedCSS = (css, incomingDOM) => {
    var style = incomingDOM.createElement("style");
    style.type = "text/css";
    style.appendChild(incomingDOM.createTextNode(css));
    style.className = getScriptClassAttribute();
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
    var library = requestly_core_1.CONSTANTS.SCRIPT_LIBRARIES[libraryKey];
    var addNextLibraries = () => {
        addLibraries(libraries, index + 1, incomingDOM);
    };
    if (library) {
        addRemoteJS(library.src, addNextLibraries, incomingDOM);
    }
    else {
        addNextLibraries();
    }
};
const addRemoteJS = (src, callback, incomingDOM) => {
    var script = incomingDOM.createElement("script");
    // NOT WORKING
    // if (typeof callback === "function") {
    // script.onload = callback
    // }
    script.type = "text/javascript";
    script.src = src;
    script.className = getScriptClassAttribute();
    (incomingDOM.head || incomingDOM.documentElement).appendChild(script);
    // HOTFIX
    callback();
};
const handleJSScripts = (jsScripts, incomingDOM) => {
    var prePageLoadScripts = [];
    var postPageLoadScripts = [];
    jsScripts.forEach((script) => {
        if (script.loadTime === requestly_core_1.CONSTANTS.SCRIPT_LOAD_TIME.BEFORE_PAGE_LOAD) {
            prePageLoadScripts.push(script);
        }
        else {
            postPageLoadScripts.push(script);
        }
    });
    includeJSScriptsInOrder(prePageLoadScripts, () => {
        includeJSScriptsInOrder(postPageLoadScripts, null, null, incomingDOM);
    }, null, incomingDOM);
};
const includeJSScriptsInOrder = (scripts, callback, indexArg, incomingDOM) => {
    var index = indexArg || 0;
    if (index >= scripts.length) {
        typeof callback === "function" && callback();
        return;
    }
    includeJS(scripts[index], () => {
        includeJSScriptsInOrder(scripts, callback, index + 1, incomingDOM);
    }, incomingDOM);
};
const includeJS = (script, callback, incomingDOM) => {
    if (script.type === requestly_core_1.CONSTANTS.SCRIPT_TYPES.URL) {
        addRemoteJS(script.value, callback, incomingDOM);
        return;
    }
    if (script.type === requestly_core_1.CONSTANTS.SCRIPT_TYPES.CODE) {
        executeJS(script.value, null, incomingDOM);
    }
    typeof callback === "function" && callback();
};
const executeJS = (code, shouldRemove, incomingDOM) => {
    const script = incomingDOM.createElement("script");
    script.type = "text/javascript";
    script.className = getScriptClassAttribute();
    script.appendChild(incomingDOM.createTextNode(code));
    const parent = incomingDOM.head || incomingDOM.documentElement;
    parent.appendChild(script);
    if (shouldRemove) {
        parent.removeChild(script);
    }
};
exports.default = process_insert_action;
