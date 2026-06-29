"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidFunctionString = void 0;
exports.executeUserFunction = executeUserFunction;
const isolated_vm_1 = __importDefault(require("isolated-vm"));
const state_1 = __importDefault(require("../components/proxy-middleware/middlewares/state"));
/**
 * RQ-2426: rule-supplied "code" rules (Modify Request/Response) used to be run
 * with `new Function(...)` directly in the proxy's Node.js process — full access
 * to require/process/fs/child_process. Since code rules travel between users
 * (shared lists, imports, team sync), that was a supply-chain RCE primitive.
 *
 * Rule code now runs inside an `isolated-vm` V8 isolate with NO host realm
 * access (no require/process/fs/network globals), a hard wall-clock timeout, and
 * a memory cap. Only copied data (args, sharedState) and a narrow set of safe
 * shims (console, atob/btoa) are exposed. The function contract is unchanged:
 * `userFn(args)` returns a string (objects are JSON-stringified), promises are
 * awaited, console output is captured, and $sharedState is read/written back.
 */
const EXEC_TIMEOUT_MS = 5000; // hard wall-clock cap; stops infinite loops
const MEMORY_LIMIT_MB = 128; // per-execution isolate memory ceiling
const VALIDATE_MEMORY_LIMIT_MB = 16;
const FETCH_TIMEOUT_MS = 10000; // per fetch() call from inside a rule
const MAX_FETCH_BODY_BYTES = 10 * 1024 * 1024; // cap response copied back into the isolate
/**
 * Host side of the sandbox `fetch`. Runs in the proxy process (the only place
 * with network), but is reachable from the isolate ONLY through this narrow,
 * explicitly-injected reference — the isolate still has no direct network/host
 * access. Returns a JSON string (a transferable primitive) describing the
 * response; the in-isolate shim rebuilds a Response-like object from it.
 *
 * Note: this preserves the prior capability of code rules to call out to APIs.
 * It does not add SSRF restrictions (outbound requests are the feature) but it
 * bounds time and response size, and only forwards method/headers/body.
 */
async function hostFetch(reqJson) {
    var _a, _b;
    let req;
    try {
        req = JSON.parse(reqJson);
    }
    catch (_c) {
        return JSON.stringify({ __rqError: "Invalid fetch arguments" });
    }
    const url = String((_a = req === null || req === void 0 ? void 0 : req.url) !== null && _a !== void 0 ? _a : "");
    const rawOpts = (_b = req === null || req === void 0 ? void 0 : req.opts) !== null && _b !== void 0 ? _b : {};
    const init = {};
    if (typeof rawOpts.method === "string")
        init.method = rawOpts.method;
    if (rawOpts.headers && typeof rawOpts.headers === "object") {
        init.headers = {};
        for (const k of Object.keys(rawOpts.headers)) {
            init.headers[k] = String(rawOpts.headers[k]);
        }
    }
    if (rawOpts.body !== undefined && rawOpts.body !== null) {
        init.body =
            typeof rawOpts.body === "string"
                ? rawOpts.body
                : JSON.stringify(rawOpts.body);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        init.signal = controller.signal;
        const resp = await fetch(url, init);
        let bodyText = await resp.text();
        if (bodyText.length > MAX_FETCH_BODY_BYTES) {
            bodyText = bodyText.slice(0, MAX_FETCH_BODY_BYTES);
        }
        const headers = {};
        resp.headers.forEach((v, k) => {
            headers[k.toLowerCase()] = v;
        });
        return JSON.stringify({
            status: resp.status,
            statusText: resp.statusText,
            ok: resp.ok,
            url: resp.url,
            headers,
            bodyText,
        });
    }
    catch (e) {
        return JSON.stringify({ __rqError: String((e && e.message) || e) });
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * Verify that a rule's code string parses as a function WITHOUT executing it in
 * the host. Compiling in a throwaway isolate proves it parses; no host globals
 * are exposed and nothing runs. Returns true if it is valid function source.
 */
const isValidFunctionString = async function (functionStringEscaped) {
    const isolate = new isolated_vm_1.default.Isolate({ memoryLimit: VALIDATE_MEMORY_LIMIT_MB });
    try {
        await isolate.compileScript(`(${functionStringEscaped})`);
        return true;
    }
    catch (_a) {
        return false;
    }
    finally {
        isolate.dispose();
    }
};
exports.isValidFunctionString = isValidFunctionString;
async function executeUserFunction(ctx, functionString, args) {
    var _a, _b, _c;
    const isolate = new isolated_vm_1.default.Isolate({ memoryLimit: MEMORY_LIMIT_MB });
    const collectedLogs = [];
    try {
        const context = await isolate.createContext();
        const jail = context.global;
        // Copy in only plain data. JSON round-trip guarantees the values are
        // structured-cloneable and strips anything non-serializable.
        const safeArgs = JSON.parse(JSON.stringify(args !== null && args !== void 0 ? args : {}));
        const sharedState = JSON.parse(JSON.stringify((_a = state_1.default.getInstance().getSharedStateCopy()) !== null && _a !== void 0 ? _a : {}));
        await jail.set("global", jail.derefInto());
        await jail.set("__args", new isolated_vm_1.default.ExternalCopy(safeArgs).copyInto());
        await jail.set("__sharedState", new isolated_vm_1.default.ExternalCopy(sharedState).copyInto());
        // console -> host capture (matches capture-console-logs shape: {type, args}).
        await jail.set("__log", new isolated_vm_1.default.Reference((payloadJson) => {
            try {
                collectedLogs.push(JSON.parse(payloadJson));
            }
            catch (_a) {
                /* ignore malformed log payloads */
            }
        }));
        // base64 helpers — the isolate has no Buffer/atob/btoa; bridge to host Buffer.
        await jail.set("__btoa", new isolated_vm_1.default.Reference((s) => Buffer.from(String(s), "binary").toString("base64")));
        await jail.set("__atob", new isolated_vm_1.default.Reference((s) => Buffer.from(String(s), "base64").toString("binary")));
        // Bridged fetch — async host reference (see hostFetch). The isolate calls it
        // via applySyncPromise, so rules can `await fetch(...)` as before.
        await jail.set("__fetch", new isolated_vm_1.default.Reference(hostFetch));
        // NOTE: the isolate intentionally has no `Buffer`, timers, `require`,
        // `process`, or `fs`. Standard ECMAScript built-ins (JSON, Math, Date, RegExp,
        // Map/Set, Promise, etc.) are available, plus the explicitly-bridged
        // console/atob/btoa/fetch below. See RQ-2426 notes for remaining parity gaps.
        const wrapped = `
      const __safe = (x) => { try { JSON.stringify(x); return x; } catch (e) { return String(x); } };
      const __emit = (type, a) => {
        try {
          __log.applySync(undefined, [JSON.stringify({ type: type, args: Array.prototype.map.call(a, __safe) })]);
        } catch (e) { /* never let logging break user code */ }
      };
      const console = {
        log:   function () { __emit("log", arguments); },
        info:  function () { __emit("info", arguments); },
        warn:  function () { __emit("warn", arguments); },
        error: function () { __emit("error", arguments); },
        debug: function () { __emit("debug", arguments); },
      };
      const btoa = (s) => __btoa.applySync(undefined, [String(s)]);
      const atob = (s) => __atob.applySync(undefined, [String(s)]);
      const fetch = async (url, opts) => {
        const raw = __fetch.applySyncPromise(undefined, [JSON.stringify({ url: String(url), opts: opts || {} })]);
        const res = JSON.parse(raw);
        if (res.__rqError) { throw new Error(res.__rqError); }
        const headers = res.headers || {};
        return {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          url: res.url,
          headers: {
            get: (h) => { const v = headers[String(h).toLowerCase()]; return v === undefined ? null : v; },
            has: (h) => Object.prototype.hasOwnProperty.call(headers, String(h).toLowerCase()),
            raw: () => headers,
          },
          text: async () => res.bodyText,
          json: async () => JSON.parse(res.bodyText),
        };
      };
      const $sharedState = __sharedState;
      const __userFn = (${functionString});
      Promise.resolve(__userFn(__args)).then(function (r) {
        let out;
        if (r === undefined || r === null) out = r;
        else if (typeof r === "object") out = JSON.stringify(r);
        else out = r;
        return JSON.stringify({ result: out, sharedState: $sharedState });
      });
    `;
        const script = await isolate.compileScript(wrapped);
        const resultJson = await script.run(context, {
            timeout: EXEC_TIMEOUT_MS,
            promise: true,
            copy: true,
        });
        let finalResponse;
        try {
            const parsed = JSON.parse(resultJson);
            finalResponse = parsed.result;
            // Write back any mutations the rule made to $sharedState.
            state_1.default.getInstance().setSharedState((_b = parsed.sharedState) !== null && _b !== void 0 ? _b : {});
        }
        catch (_d) {
            finalResponse = undefined;
        }
        if (collectedLogs.length && ((_c = ctx === null || ctx === void 0 ? void 0 : ctx.rq) === null || _c === void 0 ? void 0 : _c.consoleLogs)) {
            ctx.rq.consoleLogs.push(...collectedLogs);
        }
        // Objects are already JSON-stringified inside the isolate, so finalResponse
        // is a string (or undefined). Mirrors the previous return contract.
        return finalResponse;
    }
    finally {
        isolate.dispose();
    }
}
