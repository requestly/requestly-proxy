import variant from "@jitl/quickjs-singlefile-cjs-release-sync";
import {
  newQuickJSWASMModuleFromVariant,
  shouldInterruptAfterDeadline,
  QuickJSWASMModule,
} from "quickjs-emscripten";
import GlobalStateProvider from "../components/proxy-middleware/middlewares/state";

/**
 * RQ-2426: rule-supplied "code" rules (Modify Request/Response) used to be run
 * with `new Function(...)` directly in the proxy's Node.js process — full access
 * to require/process/fs/child_process. Code rules travel between users (shared
 * lists, import/export, team sync), so that was a supply-chain RCE primitive.
 *
 * Rule code now runs inside **QuickJS compiled to WebAssembly** (`quickjs-emscripten`).
 * QuickJS is a separate JS engine running in the WASM sandbox — it has NO access
 * to the host realm (no require/process/fs, no Node/DOM globals, no prototype path
 * back to the host). The only things the rule can touch are the values we
 * explicitly inject. This is a true isolation boundary.
 *
 * Why not isolated-vm or worker_threads + vm:
 * - isolated-vm is a native addon with no build for a currently-supported
 *   Electron's V8 (6.x too old for V8 13, 7.x needs Node 26).
 * - worker_threads cannot create a Worker in an Electron *renderer* process
 *   ("The V8 platform used by this instance of Node does not support creating
 *   Workers"), and the proxy runs in the desktop app's background renderer.
 * QuickJS-WASM is pure WASM+JS — it builds nowhere natively and runs in any JS
 * environment, including the Electron renderer.
 *
 * Contract is unchanged: `userFn(args)` returns a string (objects are
 * JSON-stringified), promises are awaited, console output is captured into
 * `ctx.rq.consoleLogs` as `{type, args}`, and `$sharedState` is read and written
 * back. Intentional parity gaps vs the old full-host env: no `fetch`/`Buffer`/
 * timers/`TextEncoder`/`URL`. (`fetch` would need the asyncify QuickJS variant +
 * an async host bridge — a follow-up; QuickJS can do it safely, unlike worker+vm.)
 */

const EXEC_TIMEOUT_MS = 5000;
const MEMORY_LIMIT_BYTES = 128 * 1024 * 1024;
const MAX_STACK_BYTES = 2 * 1024 * 1024;

// The WASM module is expensive to instantiate; build it once and reuse across
// executions. A fresh QuickJS *context* is created per execution for isolation.
let modulePromise: Promise<QuickJSWASMModule> | null = null;
function getQuickJSModule(): Promise<QuickJSWASMModule> {
  if (!modulePromise) {
    modulePromise = newQuickJSWASMModuleFromVariant(variant as any);
  }
  return modulePromise;
}

// Code that runs INSIDE the QuickJS sandbox to set up the rule environment.
// Built from primitives only (args/$sharedState arrive as JSON strings). console
// captures into __logs; atob/btoa are pure-JS (the sandbox has no Buffer).
// Statements are ';'-separated (no '//' comments) so it concatenates safely.
const SANDBOX_SETUP = [
  "var __logs = [];",
  'var __B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";',
  "function btoa(s){ s = String(s); var o = '', i = 0;",
  "  while (i < s.length) {",
  "    var r1 = s.charCodeAt(i++), r2 = s.charCodeAt(i++), r3 = s.charCodeAt(i++);",
  "    var h2 = !isNaN(r2), h3 = !isNaN(r3);",
  "    var a = r1 & 0xff, b = h2 ? r2 & 0xff : 0, c = h3 ? r3 & 0xff : 0;",
  "    o += __B64.charAt(a >> 2) + __B64.charAt(((a & 3) << 4) | (b >> 4)) + (h2 ? __B64.charAt(((b & 15) << 2) | (c >> 6)) : '=') + (h3 ? __B64.charAt(c & 63) : '=');",
  "  } return o; }",
  "function atob(s){ s = String(s).replace(/[^A-Za-z0-9+/]/g, ''); var o = '', i = 0;",
  "  while (i < s.length) {",
  "    var c1 = s.charAt(i++), c2 = s.charAt(i++), c3 = s.charAt(i++), c4 = s.charAt(i++);",
  "    var e1 = __B64.indexOf(c1), e2 = __B64.indexOf(c2), e3 = c3 === '' ? -1 : __B64.indexOf(c3), e4 = c4 === '' ? -1 : __B64.indexOf(c4);",
  "    o += String.fromCharCode((e1 << 2) | (e2 >> 4));",
  "    if (e3 !== -1) o += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));",
  "    if (e4 !== -1) o += String.fromCharCode(((e3 & 3) << 6) | e4);",
  "  } return o; }",
  "function __safe(x){ try { JSON.stringify(x); return x; } catch (e) { return String(x); } }",
  "function __emit(t, a){ try { __logs.push({ type: t, args: Array.prototype.map.call(a, __safe) }); } catch (e) {} }",
  "var console = { log: function(){ __emit('log', arguments); }, info: function(){ __emit('info', arguments); }, warn: function(){ __emit('warn', arguments); }, error: function(){ __emit('error', arguments); }, debug: function(){ __emit('debug', arguments); } };",
  "var args = JSON.parse(__argsJson);",
  "var $sharedState = JSON.parse(__sharedStateJson);",
  "var __OUTPUT = null;",
].join("");

// Pure-JS polyfills for common Web/Node globals that QuickJS (a bare ECMAScript
// engine) does not provide. All implemented INSIDE the sandbox using only QuickJS
// built-ins — no host object crosses the boundary, so they add no escape surface
// (same safety model as atob/btoa). `String.raw` keeps regex backslashes literal.
// NOTE: `crypto` here is NOT cryptographically secure (Math.random-based) — it is
// only for id/random generation; secure RNG / crypto.subtle would need a host bridge.
const SANDBOX_POLYFILLS = String.raw`
(function (g) {
  "use strict";

  // ---- URLSearchParams ----
  function URLSearchParams(init) {
    this.__l = [];
    var self = this;
    if (init == null || init === "") { /* empty */ }
    else if (typeof init === "string") {
      var s = init.charAt(0) === "?" ? init.slice(1) : init;
      if (s.length) s.split("&").forEach(function (pair) {
        if (pair === "") return;
        var idx = pair.indexOf("=");
        var k = idx === -1 ? pair : pair.slice(0, idx);
        var v = idx === -1 ? "" : pair.slice(idx + 1);
        self.__l.push([decodeURIComponent(k.replace(/\+/g, " ")), decodeURIComponent(v.replace(/\+/g, " "))]);
      });
    } else if (init instanceof Array) {
      init.forEach(function (p) { self.__l.push([String(p[0]), String(p[1])]); });
    } else if (typeof init.forEach === "function") {
      init.forEach(function (v, k) { self.__l.push([String(k), String(v)]); });
    } else if (typeof init === "object") {
      for (var key in init) if (Object.prototype.hasOwnProperty.call(init, key)) self.__l.push([key, String(init[key])]);
    }
  }
  URLSearchParams.prototype.append = function (k, v) { this.__l.push([String(k), String(v)]); };
  URLSearchParams.prototype["delete"] = function (k) { k = String(k); this.__l = this.__l.filter(function (e) { return e[0] !== k; }); };
  URLSearchParams.prototype.get = function (k) { k = String(k); for (var i = 0; i < this.__l.length; i++) if (this.__l[i][0] === k) return this.__l[i][1]; return null; };
  URLSearchParams.prototype.getAll = function (k) { k = String(k); var r = []; for (var i = 0; i < this.__l.length; i++) if (this.__l[i][0] === k) r.push(this.__l[i][1]); return r; };
  URLSearchParams.prototype.has = function (k) { return this.get(String(k)) !== null; };
  URLSearchParams.prototype.set = function (k, v) {
    k = String(k); v = String(v); var found = false; var out = [];
    for (var i = 0; i < this.__l.length; i++) {
      if (this.__l[i][0] === k) { if (!found) { out.push([k, v]); found = true; } }
      else out.push(this.__l[i]);
    }
    if (!found) out.push([k, v]); this.__l = out;
  };
  URLSearchParams.prototype.forEach = function (cb, t) { for (var i = 0; i < this.__l.length; i++) cb.call(t, this.__l[i][1], this.__l[i][0], this); };
  URLSearchParams.prototype.keys = function () { return this.__l.map(function (e) { return e[0]; }); };
  URLSearchParams.prototype.values = function () { return this.__l.map(function (e) { return e[1]; }); };
  URLSearchParams.prototype.entries = function () { return this.__l.map(function (e) { return [e[0], e[1]]; }); };
  URLSearchParams.prototype.sort = function () { this.__l.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; }); };
  URLSearchParams.prototype.toString = function () { return this.__l.map(function (e) { return encodeURIComponent(e[0]) + "=" + encodeURIComponent(e[1]); }).join("&"); };

  // ---- URL ----
  var URL_RE = /^(?:([^:/?#]+):)?(?:\/\/(?:([^/?#@]*)@)?([^/?#:]*)(?::(\d+))?)?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/;
  function URL(url, base) {
    url = String(url);
    if (base != null && !/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(url)) {
      var b = new URL(String(base));
      if (url.indexOf("//") === 0) url = b.protocol + url;
      else if (url.charAt(0) === "/") url = b.protocol + "//" + b.host + url;
      else if (url.charAt(0) === "?") url = b.protocol + "//" + b.host + b.pathname + url;
      else if (url.charAt(0) === "#") url = b.protocol + "//" + b.host + b.pathname + b.search + url;
      else url = b.protocol + "//" + b.host + b.pathname.replace(/[^/]*$/, "") + url;
    }
    var m = url.match(URL_RE);
    if (!m || !m[1]) throw new TypeError("Invalid URL: " + url);
    this.protocol = m[1].toLowerCase() + ":";
    var auth = m[2] || "", ai = auth.indexOf(":");
    this.username = ai === -1 ? auth : auth.slice(0, ai);
    this.password = ai === -1 ? "" : auth.slice(ai + 1);
    this.hostname = (m[3] || "").toLowerCase();
    this.port = m[4] || "";
    this.host = this.hostname + (this.port ? ":" + this.port : "");
    this.pathname = m[5] || (this.hostname ? "/" : "");
    this.search = (m[6] != null && m[6] !== "") ? "?" + m[6] : "";
    this.hash = (m[7] != null && m[7] !== "") ? "#" + m[7] : "";
    this.searchParams = new URLSearchParams(this.search);
    var sp = this.protocol;
    var special = sp === "http:" || sp === "https:" || sp === "ftp:" || sp === "ws:" || sp === "wss:";
    this.origin = (special && this.hostname) ? (this.protocol + "//" + this.host) : "null";
  }
  Object.defineProperty(URL.prototype, "href", {
    get: function () {
      var auth = this.username ? (this.username + (this.password ? ":" + this.password : "") + "@") : "";
      var search = this.searchParams && this.searchParams.toString ? this.searchParams.toString() : "";
      search = search ? "?" + search : "";
      var hostPart = this.host ? ("//" + auth + this.host) : (this.protocol === "file:" ? "//" : "");
      return this.protocol + hostPart + this.pathname + search + this.hash;
    },
    set: function (v) { URL.call(this, v); }
  });
  URL.prototype.toString = function () { return this.href; };
  URL.prototype.toJSON = function () { return this.href; };

  // ---- TextEncoder / TextDecoder (UTF-8) ----
  function TextEncoder() {}
  TextEncoder.prototype.encode = function (str) {
    str = String(str === undefined ? "" : str);
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var c2 = str.charCodeAt(i + 1);
        if (c2 >= 0xdc00 && c2 <= 0xdfff) {
          var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
          out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
          i++;
        } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return new Uint8Array(out);
  };
  function TextDecoder() {}
  TextDecoder.prototype.decode = function (buf) {
    if (!buf) return "";
    var bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf.buffer || buf);
    var out = "", i = 0;
    while (i < bytes.length) {
      var b = bytes[i++];
      if (b < 0x80) out += String.fromCharCode(b);
      else if (b >= 0xc0 && b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
      else if (b >= 0xe0 && b < 0xf0) out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
      else {
        var cp2 = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        cp2 -= 0x10000;
        out += String.fromCharCode(0xd800 + (cp2 >> 10), 0xdc00 + (cp2 & 0x3ff));
      }
    }
    return out;
  };

  // ---- structuredClone ----
  function structuredClone(value) {
    function cl(x, seen) {
      if (x === null || typeof x !== "object") return x;
      if (seen.has(x)) return seen.get(x);
      if (x instanceof Date) return new Date(x.getTime());
      if (x instanceof RegExp) return new RegExp(x.source, x.flags);
      var out;
      if (Array.isArray(x)) { out = []; seen.set(x, out); for (var i = 0; i < x.length; i++) out[i] = cl(x[i], seen); return out; }
      if (x instanceof Map) { out = new Map(); seen.set(x, out); x.forEach(function (v, k) { out.set(cl(k, seen), cl(v, seen)); }); return out; }
      if (x instanceof Set) { out = new Set(); seen.set(x, out); x.forEach(function (v) { out.add(cl(v, seen)); }); return out; }
      out = {}; seen.set(x, out);
      for (var key in x) if (Object.prototype.hasOwnProperty.call(x, key)) out[key] = cl(x[key], seen);
      return out;
    }
    return cl(value, new Map());
  }

  // ---- crypto (NOT cryptographically secure — Math.random based) ----
  var crypto = {
    getRandomValues: function (arr) {
      var max = arr && arr.BYTES_PER_ELEMENT ? Math.pow(256, arr.BYTES_PER_ELEMENT) : 256;
      for (var i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * max);
      return arr;
    },
    randomUUID: function () {
      var s = "";
      for (var i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) s += "-";
        else if (i === 14) s += "4";
        else if (i === 19) s += (8 + Math.floor(Math.random() * 4)).toString(16);
        else s += Math.floor(Math.random() * 16).toString(16);
      }
      return s;
    }
  };

  g.URLSearchParams = URLSearchParams;
  g.URL = URL;
  g.TextEncoder = TextEncoder;
  g.TextDecoder = TextDecoder;
  g.structuredClone = structuredClone;
  g.crypto = crypto;
})(typeof globalThis !== "undefined" ? globalThis : this);
`;

/**
 * Verify a rule's code string parses WITHOUT executing it. Constructing
 * `new Function(body)` compiles/parses the body but never runs it (the function
 * is never called), so even an IIFE-shaped string cannot execute here. Avoids the
 * `vm` module (unsupported in Electron's renderer); the sandboxed execution
 * happens inside QuickJS.
 */
export const isValidFunctionString = async function (
  functionStringEscaped: string
): Promise<boolean> {
  try {
    // eslint-disable-next-line no-new, no-new-func
    new Function(`return (${functionStringEscaped}\n);`);
    return true;
  } catch {
    return false;
  }
};

/* Expects that `functionString` has already been validated via isValidFunctionString. */
export async function executeUserFunction(
  ctx: any,
  functionString: string,
  args: any
): Promise<any> {
  let argsJson = "{}";
  try {
    argsJson = JSON.stringify(args ?? {});
  } catch {
    argsJson = "{}";
  }

  const QuickJS = await getQuickJSModule();

  // Read the $sharedState snapshot AFTER the last await. Everything from here
  // to setSharedState() below runs synchronously (no further yields), so the
  // read-modify-write is atomic w.r.t. the event loop. Reading before the
  // await would let a concurrent executeUserFunction commit in the gap, and
  // this call's stale snapshot would then clobber it (last-writer-wins).
  let sharedStateJson = "{}";
  try {
    sharedStateJson = JSON.stringify(
      GlobalStateProvider.getInstance().getSharedStateCopy() ?? {}
    );
  } catch {
    sharedStateJson = "{}";
  }

  const vm = QuickJS.newContext();

  try {
    vm.runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
    vm.runtime.setMaxStackSize(MAX_STACK_BYTES);
    // Hard wall-clock cap — interrupts infinite loops (sync and inside microtasks).
    vm.runtime.setInterruptHandler(
      shouldInterruptAfterDeadline(Date.now() + EXEC_TIMEOUT_MS)
    );

    // Inject inputs as primitive strings (parsed into objects inside the sandbox).
    const argsHandle = vm.newString(argsJson);
    vm.setProp(vm.global, "__argsJson", argsHandle);
    argsHandle.dispose();
    const sharedHandle = vm.newString(sharedStateJson);
    vm.setProp(vm.global, "__sharedStateJson", sharedHandle);
    sharedHandle.dispose();

    // The user fn is appended after a newline so a trailing '//' comment can't
    // swallow the marshaling code. Result (or error) + console + $sharedState are
    // serialized into the __OUTPUT global, which we read back on the host side.
    const program =
      SANDBOX_POLYFILLS +
      SANDBOX_SETUP +
      "Promise.resolve((" +
      functionString +
      "\n)(args)).then(function (r) {" +
      "  var out;" +
      "  if (r === undefined || r === null) { out = r; }" +
      '  else if (typeof r === "object") { out = JSON.stringify(r); }' +
      "  else { out = r; }" +
      "  __OUTPUT = JSON.stringify({ result: out, sharedState: $sharedState, logs: __logs });" +
      "}).catch(function (e) {" +
      "  __OUTPUT = JSON.stringify({ error: String((e && e.message) || e), logs: __logs });" +
      "});";

    const evalResult = vm.evalCode(program);
    if (evalResult.error) {
      // Syntax/throw at the top level (outside the user fn's promise).
      evalResult.error.dispose();
      return undefined;
    }
    // Success variant — dispose the completion value (we read __OUTPUT instead).
    (evalResult as { value: { dispose(): void } }).value.dispose();

    // Resolve the user fn's (possibly async-but-IO-free) promise microtasks.
    // On a job error / deadline interrupt the result carries a QuickJSHandle;
    // dispose it eagerly (vm.dispose() in finally would reclaim it too).
    const jobs = vm.runtime.executePendingJobs();
    if (jobs.error) jobs.error.dispose();

    const outHandle = vm.getProp(vm.global, "__OUTPUT");
    const output = vm.dump(outHandle);
    outHandle.dispose();

    if (typeof output !== "string") {
      // Promise never settled (e.g. unsupported real async) → no modification.
      return undefined;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(output);
    } catch {
      return undefined;
    }

    if (parsed.logs?.length && ctx?.rq?.consoleLogs) {
      ctx.rq.consoleLogs.push(...parsed.logs);
    }

    if (parsed.error) {
      if (ctx?.rq?.consoleLogs) {
        ctx.rq.consoleLogs.push({ type: "error", args: [String(parsed.error)] });
      }
      return undefined;
    }

    // Write back any mutations the rule made to $sharedState.
    GlobalStateProvider.getInstance().setSharedState(parsed.sharedState ?? {});

    // Objects were JSON-stringified inside the sandbox, so result is a string
    // (or null/undefined) — mirrors the previous return contract.
    return parsed.result;
  } finally {
    vm.dispose();
  }
}
