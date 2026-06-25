"use strict";
/**
 * sandbox-globals — the JavaScript SOURCE that runs INSIDE the QuickJS guest realm.
 *
 * These are plain strings injected into the sandbox; nothing here executes in the
 * host. `index.ts` owns the host side (module/context lifecycle, the
 * crypto/fetch/timer bridges, the pump loop).
 *
 * Organised by concern, each an IIFE that augments `globalThis` (except HARNESS,
 * which must stay top-level so its `var`/`function` bindings are script-global).
 * They are concatenated in DEPENDENCY ORDER into `SANDBOX_PRELUDE`:
 *
 *   ENCODING   atob/btoa, TextEncoder/Decoder, shared byte helpers (__rqb)
 *   BINARY     Buffer, Blob                         (use __rqb)
 *   URL        URL, URLSearchParams
 *   HTTP_TYPES Headers, FormData, Request, Response
 *   CLONE      structuredClone
 *   CRYPTO     crypto.* + require()                 [host bridge: __hostCrypto]
 *   NETWORK    fetch, XMLHttpRequest, WebSocket     [host bridge: __hostFetch]
 *   TIMERS     setTimeout/setInterval/…, performance [host bridge: __hostTimer]
 *   HARNESS    console + args/$sharedState/__OUTPUT (top-level; reads host-injected
 *              __argsJson/__sharedStateJson; the user fn wrapper runs after it)
 *
 * Security: pure shims never touch the host. The bridged blocks (CRYPTO/NETWORK/
 * TIMERS) call host functions that take and return only JSON-serialisable data —
 * no host object is ever handed to the guest, so there is no escape surface.
 * `String.raw` keeps regex/`\r\n` backslashes literal so they reach the sandbox JS.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SANDBOX_PRELUDE = void 0;
const G = '(typeof globalThis !== "undefined" ? globalThis : this)';
// ── ENCODING ── base64, UTF-8, and the internal byte helpers (__rqb) every other
// block shares. Must be first: BINARY/CRYPTO/NETWORK depend on __rqb.
const ENCODING = String.raw `
(function (g) {
  "use strict";

  // ---- base64 (atob / btoa) ----
  var __B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  g.btoa = function (s) {
    s = String(s); var o = "", i = 0;
    while (i < s.length) {
      var r1 = s.charCodeAt(i++), r2 = s.charCodeAt(i++), r3 = s.charCodeAt(i++);
      var h2 = !isNaN(r2), h3 = !isNaN(r3);
      var a = r1 & 0xff, b = h2 ? r2 & 0xff : 0, c = h3 ? r3 & 0xff : 0;
      o += __B64.charAt(a >> 2) + __B64.charAt(((a & 3) << 4) | (b >> 4)) + (h2 ? __B64.charAt(((b & 15) << 2) | (c >> 6)) : "=") + (h3 ? __B64.charAt(c & 63) : "=");
    }
    return o;
  };
  g.atob = function (s) {
    s = String(s).replace(/[^A-Za-z0-9+/]/g, ""); var o = "", i = 0;
    while (i < s.length) {
      var c1 = s.charAt(i++), c2 = s.charAt(i++), c3 = s.charAt(i++), c4 = s.charAt(i++);
      var e1 = __B64.indexOf(c1), e2 = __B64.indexOf(c2), e3 = c3 === "" ? -1 : __B64.indexOf(c3), e4 = c4 === "" ? -1 : __B64.indexOf(c4);
      o += String.fromCharCode((e1 << 2) | (e2 >> 4));
      if (e3 !== -1) o += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
      if (e4 !== -1) o += String.fromCharCode(((e3 & 3) << 6) | e4);
    }
    return o;
  };

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
  g.TextEncoder = TextEncoder;
  g.TextDecoder = TextDecoder;

  // ---- internal byte helpers shared by BINARY / CRYPTO / NETWORK ----
  var _hex = "0123456789abcdef";
  g.__rqb = {
    u8: function (s) { return Array.prototype.slice.call(new TextEncoder().encode(String(s))); },
    s8: function (b) { return new TextDecoder().decode(new Uint8Array(b)); },
    toHex: function (b) { var o = ""; for (var i = 0; i < b.length; i++) { o += _hex[(b[i] >> 4) & 15] + _hex[b[i] & 15]; } return o; },
    fromHex: function (s) { s = String(s); var o = []; for (var i = 0; i + 1 < s.length; i += 2) { o.push(parseInt(s.substr(i, 2), 16)); } return o; },
    toB64: function (b) { var s = ""; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i] & 255); return g.btoa(s); },
    fromB64: function (s) { var bin = g.atob(String(s)); var o = []; for (var i = 0; i < bin.length; i++) o.push(bin.charCodeAt(i) & 255); return o; }
  };
})(${G});
`;
// ── BINARY ── Buffer + Blob (pure JS over Uint8Array; utf8/base64/hex).
const BINARY = String.raw `
(function (g) {
  "use strict";
  var B = g.__rqb, _u8 = B.u8, _s8 = B.s8, _toHex = B.toHex, _fromHex = B.fromHex, _toB64 = B.toB64, _fromB64 = B.fromB64;

  // ---- Buffer ----
  function _mkBuf(bytes) {
    var u = new Uint8Array(bytes); u.__isBuffer = true;
    u.toString = function (enc) {
      enc = (enc || "utf8").toLowerCase(); var a = Array.prototype.slice.call(this);
      if (enc === "base64") return _toB64(a);
      if (enc === "hex") return _toHex(a);
      if (enc === "latin1" || enc === "binary") { var s = ""; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return s; }
      return _s8(a);
    };
    return u;
  }
  function Buffer() {}
  Buffer.from = function (value, enc) {
    var bytes;
    if (typeof value === "string") {
      enc = (enc || "utf8").toLowerCase();
      if (enc === "base64") bytes = _fromB64(value);
      else if (enc === "hex") bytes = _fromHex(value);
      else if (enc === "latin1" || enc === "binary") { bytes = []; for (var i = 0; i < value.length; i++) bytes.push(value.charCodeAt(i) & 255); }
      else bytes = _u8(value);
    }
    else if (value instanceof Uint8Array) { bytes = Array.prototype.slice.call(value); }
    else if (value instanceof ArrayBuffer) { bytes = Array.prototype.slice.call(new Uint8Array(value)); }
    else if (value && value.buffer instanceof ArrayBuffer) { bytes = Array.prototype.slice.call(new Uint8Array(value.buffer, value.byteOffset || 0, value.byteLength)); }
    else if (Array.isArray(value)) { bytes = value.slice(); }
    else bytes = [];
    return _mkBuf(bytes);
  };
  Buffer.alloc = function (n, fill) { var b = []; for (var i = 0; i < n; i++) b.push(typeof fill === "number" ? (fill & 255) : 0); return _mkBuf(b); };
  Buffer.isBuffer = function (x) { return !!(x && x.__isBuffer); };
  Buffer.byteLength = function (s, enc) { return Buffer.from(s, enc).length; };
  Buffer.concat = function (list) { var all = []; for (var i = 0; i < list.length; i++) { for (var j = 0; j < list[i].length; j++) all.push(list[i][j]); } return _mkBuf(all); };
  g.Buffer = Buffer;

  // ---- Blob ----
  function Blob(parts, opts) {
    var bytes = []; parts = parts || [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (typeof p === "string") { var b = _u8(p); for (var j = 0; j < b.length; j++) bytes.push(b[j]); }
      else if (p && p.__isBlob) { for (var n = 0; n < p.__bytes.length; n++) bytes.push(p.__bytes[n]); }
      else if (p instanceof Uint8Array || (p && p.__isBuffer)) { for (var k = 0; k < p.length; k++) bytes.push(p[k]); }
      else if (p instanceof ArrayBuffer) { var u = new Uint8Array(p); for (var m = 0; m < u.length; m++) bytes.push(u[m]); }
      else { var s = _u8(String(p)); for (var q = 0; q < s.length; q++) bytes.push(s[q]); }
    }
    this.__isBlob = true; this.__bytes = bytes; this.size = bytes.length; this.type = (opts && opts.type) || "";
  }
  Blob.prototype.text = function () { return Promise.resolve(_s8(this.__bytes)); };
  Blob.prototype.arrayBuffer = function () { return Promise.resolve(new Uint8Array(this.__bytes).buffer); };
  Blob.prototype.slice = function (s, e, type) { var b = this.__bytes.slice(s, e); var nb = new Blob([], {}); nb.__bytes = b; nb.size = b.length; nb.type = type || ""; return nb; };
  g.Blob = Blob;
})(${G});
`;
// ── URL ── URL + URLSearchParams (pure JS; QuickJS has no URL constructor).
const URL_API = String.raw `
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

  g.URLSearchParams = URLSearchParams;
  g.URL = URL;
})(${G});
`;
// ── HTTP_TYPES ── Headers, FormData, Request, Response (data holders used by NETWORK).
const HTTP_TYPES = String.raw `
(function (g) {
  "use strict";

  // ---- Headers ----
  function Headers(obj) {
    this.__h = {};
    for (var k in (obj || {})) if (Object.prototype.hasOwnProperty.call(obj, k)) this.__h[String(k).toLowerCase()] = obj[k];
  }
  Headers.prototype.get = function (k) { var v = this.__h[String(k).toLowerCase()]; return v == null ? null : v; };
  Headers.prototype.has = function (k) { return String(k).toLowerCase() in this.__h; };
  Headers.prototype.set = function (k, v) { this.__h[String(k).toLowerCase()] = v; };
  Headers.prototype.append = function (k, v) { this.__h[String(k).toLowerCase()] = v; };
  Headers.prototype["delete"] = function (k) { delete this.__h[String(k).toLowerCase()]; };
  Headers.prototype.forEach = function (cb, t) { for (var k in this.__h) cb.call(t, this.__h[k], k, this); };
  g.Headers = Headers;

  // ---- FormData ----
  function FormData() { this.__e = []; }
  FormData.prototype.append = function (k, v, fn) { this.__e.push([String(k), v, fn]); };
  FormData.prototype.set = function (k, v, fn) { this["delete"](k); this.__e.push([String(k), v, fn]); };
  FormData.prototype.get = function (k) { k = String(k); for (var i = 0; i < this.__e.length; i++) if (this.__e[i][0] === k) return this.__e[i][1]; return null; };
  FormData.prototype.getAll = function (k) { k = String(k); var r = []; for (var i = 0; i < this.__e.length; i++) if (this.__e[i][0] === k) r.push(this.__e[i][1]); return r; };
  FormData.prototype.has = function (k) { return this.get(String(k)) !== null; };
  FormData.prototype["delete"] = function (k) { k = String(k); this.__e = this.__e.filter(function (e) { return e[0] !== k; }); };
  FormData.prototype.forEach = function (cb, t) { for (var i = 0; i < this.__e.length; i++) cb.call(t, this.__e[i][1], this.__e[i][0], this); };
  FormData.prototype.entries = function () { return this.__e.map(function (e) { return [e[0], e[1]]; }); };
  FormData.prototype.keys = function () { return this.__e.map(function (e) { return e[0]; }); };
  FormData.prototype.values = function () { return this.__e.map(function (e) { return e[1]; }); };
  g.FormData = FormData;

  // ---- Request / Response (data holders) ----
  function Request(input, init) { init = init || {}; this.url = (input && input.url) ? input.url : String(input); this.method = init.method || (input && input.method) || "GET"; this.headers = new g.Headers(init.headers || (input && input.headers) || {}); this.body = init.body != null ? init.body : (input && input.body); this.__isRequest = true; }
  Request.prototype.clone = function () { return new Request(this, {}); };
  g.Request = Request;
  function Response(body, init) { init = init || {}; this.__body = body == null ? "" : String(body); this.status = init.status != null ? init.status : 200; this.statusText = init.statusText || ""; this.ok = this.status >= 200 && this.status < 300; this.headers = new g.Headers(init.headers || {}); this.__isResponse = true; }
  Response.prototype.text = function () { return Promise.resolve(this.__body); };
  Response.prototype.json = function () { var b = this.__body; return Promise.resolve(JSON.parse(b)); };
  Response.prototype.arrayBuffer = function () { return Promise.resolve(new Uint8Array(g.__rqb.u8(this.__body)).buffer); };
  g.Response = Response;
})(${G});
`;
// ── CLONE ── structuredClone (deep clone of JSON-ish + Date/RegExp/Map/Set, cyclic-safe).
const CLONE = String.raw `
(function (g) {
  "use strict";
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
  g.structuredClone = structuredClone;
})(${G});
`;
// ── CRYPTO ── real entropy/digests via the host's node:crypto (bridge: __hostCrypto).
// require('crypto') maps here; any other require(...) throws a guided error.
const CRYPTO = String.raw `
(function (g) {
  "use strict";
  var B = g.__rqb, _u8 = B.u8, _toB64 = B.toB64, _fromHex = B.fromHex;

  g.crypto = {
    randomUUID: function () {
      return JSON.parse(__hostCrypto(JSON.stringify({ op: "randomUUID" }))).uuid;
    },
    getRandomValues: function (arr) {
      var r = JSON.parse(__hostCrypto(JSON.stringify({ op: "randomBytes", size: arr.length })));
      for (var i = 0; i < arr.length; i++) arr[i] = r.bytes[i];
      return arr;
    }
  };

  // ---- crypto.subtle.digest (webcrypto) — keyless hashing; binary-exact via base64 ----
  g.crypto.subtle = {
    digest: function (algo, data) {
      var name = (typeof algo === "string" ? algo : (algo && algo.name) || "SHA-256").toLowerCase().replace("-", "");
      var bytes;
      if (typeof data === "string") bytes = _u8(data);
      else if (data instanceof ArrayBuffer) bytes = Array.prototype.slice.call(new Uint8Array(data));
      else if (data && data.buffer) bytes = Array.prototype.slice.call(new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength));
      else bytes = Array.prototype.slice.call(data || []);
      var hex = JSON.parse(__hostCrypto(JSON.stringify({ op: "hash", algo: name, data: _toB64(bytes), dataEncoding: "base64", encoding: "hex" }))).digest;
      return Promise.resolve(new Uint8Array(_fromHex(hex)).buffer);
    }
  };

  // ---- node:crypto subset (reachable via require('crypto')) ----
  var nodeCrypto = {
    randomUUID: g.crypto.randomUUID,
    randomBytes: function (n) {
      return JSON.parse(__hostCrypto(JSON.stringify({ op: "randomBytes", size: n }))).bytes;
    },
    createHash: function (algo) {
      var buf = "";
      return {
        update: function (d) { buf += String(d); return this; },
        digest: function (enc) { return JSON.parse(__hostCrypto(JSON.stringify({ op: "hash", algo: algo, data: buf, encoding: enc || "hex" }))).digest; }
      };
    },
    createHmac: function (algo, key) {
      var buf = "";
      return {
        update: function (d) { buf += String(d); return this; },
        digest: function (enc) { return JSON.parse(__hostCrypto(JSON.stringify({ op: "hmac", algo: algo, key: String(key), data: buf, encoding: enc || "hex" }))).digest; }
      };
    }
  };

  g.require = function (name) {
    if (name === "crypto" || name === "node:crypto") return nodeCrypto;
    throw new Error("Cannot require('" + name + "') — modules are not available in sandboxed rules");
  };
})(${G});
`;
// ── NETWORK ── fetch (single, body-aware) + XMLHttpRequest + WebSocket-guard
// (bridge: __hostFetch; http(s)-only + credentials:'omit' policy is enforced host-side).
const NETWORK = String.raw `
(function (g) {
  "use strict";
  var _s8 = g.__rqb.s8;

  function _multipart(fd) {
    var boundary = "----RQFormBoundary" + crypto.randomUUID().replace(/-/g, "");
    var CRLF = "\r\n", body = "";
    fd.__e.forEach(function (e) {
      var name = e[0], val = e[1], fn = e[2];
      body += "--" + boundary + CRLF;
      if (val && val.__isBlob) { body += 'Content-Disposition: form-data; name="' + name + '"' + (fn ? '; filename="' + fn + '"' : "") + CRLF; if (val.type) body += "Content-Type: " + val.type + CRLF; body += CRLF + _s8(val.__bytes) + CRLF; }
      else { body += 'Content-Disposition: form-data; name="' + name + '"' + CRLF + CRLF + String(val) + CRLF; }
    });
    body += "--" + boundary + "--" + CRLF;
    return { body: body, contentType: "multipart/form-data; boundary=" + boundary };
  }

  // One fetch: accepts a Request or url, normalises FormData/Blob/URLSearchParams
  // bodies + Headers, marshals to the host bridge, returns a Response-like object.
  g.fetch = function (input, init) {
    init = init || {};
    if (input instanceof g.Request) { init = { method: input.method, headers: input.headers, body: input.body }; input = input.url; }
    var body = init.body, headers = init.headers || {};
    if (body && body.__isBlob) { body = _s8(body.__bytes); }
    else if (body instanceof g.FormData) { var mp = _multipart(body); body = mp.body; var o = {}; if (headers && headers.forEach) { headers.forEach(function (v, k) { o[k] = v; }); } else { for (var k in headers) o[k] = headers[k]; } o["content-type"] = mp.contentType; headers = o; }
    else if (body instanceof g.URLSearchParams) { body = body.toString(); var o2 = {}; for (var k2 in headers) o2[k2] = headers[k2]; if (!o2["content-type"] && !o2["Content-Type"]) o2["content-type"] = "application/x-www-form-urlencoded"; headers = o2; }
    if (headers && typeof headers.forEach === "function" && headers.__h) { var oh = {}; headers.forEach(function (v, k) { oh[k] = v; }); headers = oh; }
    var req = JSON.stringify({ url: String(input), method: init.method || "GET", headers: headers, body: body != null ? String(body) : undefined });
    return __hostFetch(req).then(function (jsonStr) {
      var d = JSON.parse(jsonStr);
      if (d && d.__fetchError) throw new Error(d.__fetchError);
      return {
        status: d.status, statusText: d.statusText, ok: d.ok, url: d.url,
        headers: new g.Headers(d.headers),
        text: function () { return Promise.resolve(d.body); },
        json: function () { return Promise.resolve(JSON.parse(d.body)); }
      };
    });
  };

  // ---- XMLHttpRequest (async only; sync throws) over the fetch bridge ----
  function XMLHttpRequest() { this.readyState = 0; this.status = 0; this.statusText = ""; this.responseText = ""; this.response = ""; this.responseType = ""; this._h = {}; this._m = "GET"; this._u = ""; this._rh = {}; this.onreadystatechange = null; this.onload = null; this.onerror = null; this.onloadend = null; }
  XMLHttpRequest.UNSENT = 0; XMLHttpRequest.OPENED = 1; XMLHttpRequest.HEADERS_RECEIVED = 2; XMLHttpRequest.LOADING = 3; XMLHttpRequest.DONE = 4;
  XMLHttpRequest.prototype.open = function (method, url, async) { if (async === false) throw new Error("Synchronous XMLHttpRequest is not supported in sandboxed rules; use async or fetch()."); this._m = method || "GET"; this._u = String(url); this.readyState = 1; if (this.onreadystatechange) this.onreadystatechange(); };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) { this._h[k] = v; };
  XMLHttpRequest.prototype.getAllResponseHeaders = function () { var s = ""; for (var k in this._rh) s += k + ": " + this._rh[k] + "\r\n"; return s; };
  XMLHttpRequest.prototype.getResponseHeader = function (k) { k = String(k).toLowerCase(); return (k in this._rh) ? this._rh[k] : null; };
  XMLHttpRequest.prototype.abort = function () {};
  XMLHttpRequest.prototype.send = function (body) {
    var self = this;
    g.fetch(this._u, { method: this._m, headers: this._h, body: body }).then(function (res) { self.status = res.status; self.statusText = res.statusText || ""; self._rh = {}; if (res.headers && res.headers.forEach) res.headers.forEach(function (v, k) { self._rh[String(k).toLowerCase()] = v; }); return res.text(); })
      .then(function (text) { self.responseText = text; self.response = (self.responseType === "json") ? (function () { try { return JSON.parse(text); } catch (e) { return null; } })() : text; self.readyState = 4; if (self.onreadystatechange) self.onreadystatechange(); if (self.onload) self.onload(); if (self.onloadend) self.onloadend(); })
      .catch(function (e) { self.readyState = 4; if (self.onreadystatechange) self.onreadystatechange(); if (self.onerror) self.onerror(e); if (self.onloadend) self.onloadend(); });
  };
  g.XMLHttpRequest = XMLHttpRequest;

  // ---- WebSocket: unsupported (a persistent connection can't outlive a per-request execution) ----
  g.WebSocket = function () { throw new Error("WebSocket is not available in sandboxed rules (no persistent connections)."); };
})(${G});
`;
// ── TIMERS ── setTimeout honors the real delay via __hostTimer (clamped host-side
// to the execution budget); setInterval is a no-op (a repeating timer can't outlive
// a per-request execution); queueMicrotask + performance are pure.
const TIMERS = String.raw `
(function (g) {
  "use strict";
  var _cancelled = {}, _tid = 0;
  g.setTimeout = function (fn, ms) {
    var id = ++_tid; var args = Array.prototype.slice.call(arguments, 2);
    __hostTimer(Number(ms) || 0).then(function () { if (!_cancelled[id] && typeof fn === "function") fn.apply(null, args); });
    return id;
  };
  g.clearTimeout = function (id) { _cancelled[id] = true; };
  g.setInterval = function () { return ++_tid; };
  g.clearInterval = function () {};
  g.queueMicrotask = function (fn) { Promise.resolve().then(fn); };
  g.performance = g.performance || { now: function () { return Date.now(); }, timeOrigin: 0 };
})(${G});
`;
// ── HARNESS ── the run environment. MUST be top-level (not an IIFE) so `console`,
// `args`, `$sharedState`, `__OUTPUT` are script-globals the user-fn wrapper reads.
// Reads the host-injected `__argsJson`/`__sharedStateJson`. ';'-separated, no
// '//' comments, so it concatenates safely.
const HARNESS = [
    "var __logs = [];",
    "function __safe(x){ try { JSON.stringify(x); return x; } catch (e) { return String(x); } }",
    "function __emit(t, a){ try { __logs.push({ type: t, args: Array.prototype.map.call(a, __safe) }); } catch (e) {} }",
    "var console = { log: function(){ __emit('log', arguments); }, info: function(){ __emit('info', arguments); }, warn: function(){ __emit('warn', arguments); }, error: function(){ __emit('error', arguments); }, debug: function(){ __emit('debug', arguments); } };",
    "var args = JSON.parse(__argsJson);",
    "var $sharedState = JSON.parse(__sharedStateJson);",
    "var __OUTPUT = null;",
].join("");
/**
 * The complete in-guest prelude, concatenated in dependency order. index.ts
 * appends the user-function wrapper after this.
 */
exports.SANDBOX_PRELUDE = ENCODING + BINARY + URL_API + HTTP_TYPES + CLONE + CRYPTO + NETWORK + TIMERS + HARNESS;
