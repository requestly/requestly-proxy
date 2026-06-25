"use strict";
/**
 * sandbox-globals — the JavaScript SOURCE that runs INSIDE the QuickJS guest realm
 * (split out of utils/index.ts for readability/debuggability). These are plain
 * strings injected into the sandbox; nothing here executes in the host. index.ts
 * owns the host side (module/context lifecycle, the crypto/fetch bridges, the
 * pump loop). Three blocks, concatenated in this order by executeUserFunction:
 *   SANDBOX_POLYFILLS  — pure-JS web/Node global shims (URL, encoding, clone…)
 *   SANDBOX_BRIDGE_SHIMS — guest halves of the host bridges (crypto, fetch, require)
 *   SANDBOX_SETUP      — console/atob/btoa + args/$sharedState/__OUTPUT wiring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SANDBOX_EXTRA_SHIMS = exports.SANDBOX_BRIDGE_SHIMS = exports.SANDBOX_POLYFILLS = exports.SANDBOX_SETUP = void 0;
// Code that runs INSIDE the QuickJS sandbox to set up the rule environment.
// Built from primitives only (args/$sharedState arrive as JSON strings). console
// captures into __logs; atob/btoa are pure-JS (the sandbox has no Buffer).
// Statements are ';'-separated (no '//' comments) so it concatenates safely.
exports.SANDBOX_SETUP = [
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
// NOTE: `crypto` and `fetch` are NOT here — they need real host capabilities and
// live in SANDBOX_BRIDGE_SHIMS (the guest halves of the host bridges).
exports.SANDBOX_POLYFILLS = String.raw `
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

  g.URLSearchParams = URLSearchParams;
  g.URL = URL;
  g.TextEncoder = TextEncoder;
  g.TextDecoder = TextDecoder;
  g.structuredClone = structuredClone;
})(typeof globalThis !== "undefined" ? globalThis : this);
`;
// In-guest shims for the HOST-BRIDGED capabilities (crypto, fetch). These call
// the host functions __hostCrypto (sync) / __hostFetch (async) that
// executeUserFunction installs. Only JSON strings cross the boundary — the host
// handlers receive a string and return a string (fetch via a guest promise the
// host resolves), so no host object is ever exposed to the rule code.
exports.SANDBOX_BRIDGE_SHIMS = String.raw `
(function (g) {
  "use strict";

  // ---- crypto (real entropy/digests via the host's node:crypto) ----
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
  // node:crypto subset reachable via require('crypto')
  var nodeCrypto = {
    randomUUID: g.crypto.randomUUID,
    randomBytes: function (n) {
      var r = JSON.parse(__hostCrypto(JSON.stringify({ op: "randomBytes", size: n })));
      return r.bytes;
    },
    createHash: function (algo) {
      var buf = "";
      return {
        update: function (d) { buf += String(d); return this; },
        digest: function (enc) {
          return JSON.parse(__hostCrypto(JSON.stringify({ op: "hash", algo: algo, data: buf, encoding: enc || "hex" }))).digest;
        }
      };
    }
  };

  // ---- require() — safe modules map to bridges; everything else is a guided error ----
  g.require = function (name) {
    if (name === "crypto" || name === "node:crypto") return nodeCrypto;
    throw new Error("Cannot require('" + name + "') — modules are not available in sandboxed rules");
  };

  // ---- fetch (real HTTP via the host; copied request/response only) ----
  function Headers(obj) {
    this.__h = {};
    for (var k in (obj || {})) if (Object.prototype.hasOwnProperty.call(obj, k)) this.__h[String(k).toLowerCase()] = obj[k];
  }
  Headers.prototype.get = function (k) { var v = this.__h[String(k).toLowerCase()]; return v == null ? null : v; };
  Headers.prototype.has = function (k) { return String(k).toLowerCase() in this.__h; };
  Headers.prototype.forEach = function (cb, t) { for (var k in this.__h) cb.call(t, this.__h[k], k, this); };
  g.Headers = Headers;

  g.fetch = function (url, init) {
    init = init || {};
    var hdrs = init.headers || {};
    if (hdrs && typeof hdrs.forEach === "function" && hdrs.__h) { var o = {}; hdrs.forEach(function (v, k) { o[k] = v; }); hdrs = o; }
    var req = JSON.stringify({
      url: String(url),
      method: init.method || "GET",
      headers: hdrs,
      body: init.body != null ? String(init.body) : undefined
    });
    return __hostFetch(req).then(function (jsonStr) {
      var d = JSON.parse(jsonStr);
      if (d && d.__fetchError) throw new Error(d.__fetchError);
      return {
        status: d.status, statusText: d.statusText, ok: d.ok, url: d.url,
        headers: new Headers(d.headers),
        text: function () { return Promise.resolve(d.body); },
        json: function () { return Promise.resolve(JSON.parse(d.body)); }
      };
    });
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
`;
// Additional Web/Node APIs layered on top of the polyfills + bridges. Pure-JS
// where possible (Buffer, timers, Blob, FormData, Request/Response, performance);
// XHR rides the fetch bridge; createHmac/subtle.digest ride the crypto bridge.
// MUST be concatenated AFTER SANDBOX_POLYFILLS + SANDBOX_BRIDGE_SHIMS (uses
// TextEncoder/Headers/URLSearchParams, fetch, __hostCrypto, atob/btoa).
exports.SANDBOX_EXTRA_SHIMS = String.raw `
(function (g) {
  "use strict";
  var _hex = "0123456789abcdef";
  function _u8(s){ return Array.prototype.slice.call(new TextEncoder().encode(String(s))); }
  function _s8(b){ return new TextDecoder().decode(new Uint8Array(b)); }
  function _toHex(b){ var o=""; for(var i=0;i<b.length;i++){ o+=_hex[(b[i]>>4)&15]+_hex[b[i]&15]; } return o; }
  function _fromHex(s){ s=String(s); var o=[]; for(var i=0;i+1<s.length;i+=2){ o.push(parseInt(s.substr(i,2),16)); } return o; }
  function _toB64(b){ var s=""; for(var i=0;i<b.length;i++) s+=String.fromCharCode(b[i]&255); return btoa(s); }
  function _fromB64(s){ var bin=atob(String(s)); var o=[]; for(var i=0;i<bin.length;i++) o.push(bin.charCodeAt(i)&255); return o; }

  // ---- Buffer (pure-JS; utf8/base64/hex/latin1) ----
  function _mkBuf(bytes){
    var u = new Uint8Array(bytes); u.__isBuffer = true;
    u.toString = function(enc){
      enc=(enc||"utf8").toLowerCase(); var a=Array.prototype.slice.call(this);
      if(enc==="base64") return _toB64(a);
      if(enc==="hex") return _toHex(a);
      if(enc==="latin1"||enc==="binary"){ var s=""; for(var i=0;i<a.length;i++) s+=String.fromCharCode(a[i]); return s; }
      return _s8(a);
    };
    return u;
  }
  function Buffer(){}
  Buffer.from = function(value, enc){
    var bytes;
    if (typeof value === "string"){ enc=(enc||"utf8").toLowerCase();
      if(enc==="base64") bytes=_fromB64(value);
      else if(enc==="hex") bytes=_fromHex(value);
      else if(enc==="latin1"||enc==="binary"){ bytes=[]; for(var i=0;i<value.length;i++) bytes.push(value.charCodeAt(i)&255); }
      else bytes=_u8(value);
    }
    else if (value instanceof Uint8Array){ bytes=Array.prototype.slice.call(value); }
    else if (value instanceof ArrayBuffer){ bytes=Array.prototype.slice.call(new Uint8Array(value)); }
    else if (value && value.buffer instanceof ArrayBuffer){ bytes=Array.prototype.slice.call(new Uint8Array(value.buffer, value.byteOffset||0, value.byteLength)); }
    else if (Array.isArray(value)){ bytes=value.slice(); }
    else bytes=[];
    return _mkBuf(bytes);
  };
  Buffer.alloc = function(n, fill){ var b=[]; for(var i=0;i<n;i++) b.push(typeof fill==="number"?(fill&255):0); return _mkBuf(b); };
  Buffer.isBuffer = function(x){ return !!(x && x.__isBuffer); };
  Buffer.byteLength = function(s, enc){ return Buffer.from(s, enc).length; };
  Buffer.concat = function(list){ var all=[]; for(var i=0;i<list.length;i++){ for(var j=0;j<list[i].length;j++) all.push(list[i][j]); } return _mkBuf(all); };
  g.Buffer = Buffer;

  // ---- timers + microtask (request-scoped: setTimeout fires once via microtask, ignoring delay; setInterval is a no-op) ----
  var _cancelled = {}, _tid = 0;
  g.setTimeout = function(fn, ms){ var id=++_tid; var args=Array.prototype.slice.call(arguments,2);
    Promise.resolve().then(function(){ if(!_cancelled[id] && typeof fn==="function") fn.apply(null,args); }); return id; };
  g.clearTimeout = function(id){ _cancelled[id]=true; };
  g.setInterval = function(){ return ++_tid; };
  g.clearInterval = function(){};
  g.queueMicrotask = function(fn){ Promise.resolve().then(fn); };

  // ---- performance ----
  g.performance = g.performance || { now: function(){ return Date.now(); }, timeOrigin: 0 };

  // ---- Blob ----
  function Blob(parts, opts){
    var bytes=[]; parts=parts||[];
    for(var i=0;i<parts.length;i++){ var p=parts[i];
      if(typeof p==="string"){ var b=_u8(p); for(var j=0;j<b.length;j++) bytes.push(b[j]); }
      else if(p && p.__isBlob){ for(var n=0;n<p.__bytes.length;n++) bytes.push(p.__bytes[n]); }
      else if(p instanceof Uint8Array || (p&&p.__isBuffer)){ for(var k=0;k<p.length;k++) bytes.push(p[k]); }
      else if(p instanceof ArrayBuffer){ var u=new Uint8Array(p); for(var m=0;m<u.length;m++) bytes.push(u[m]); }
      else { var s=_u8(String(p)); for(var q=0;q<s.length;q++) bytes.push(s[q]); }
    }
    this.__isBlob=true; this.__bytes=bytes; this.size=bytes.length; this.type=(opts&&opts.type)||"";
  }
  Blob.prototype.text = function(){ return Promise.resolve(_s8(this.__bytes)); };
  Blob.prototype.arrayBuffer = function(){ return Promise.resolve(new Uint8Array(this.__bytes).buffer); };
  Blob.prototype.slice = function(s,e,type){ var b=this.__bytes.slice(s,e); var nb=new Blob([],{}); nb.__bytes=b; nb.size=b.length; nb.type=type||""; return nb; };
  g.Blob = Blob;

  // ---- FormData ----
  function FormData(){ this.__e=[]; }
  FormData.prototype.append=function(k,v,fn){ this.__e.push([String(k),v,fn]); };
  FormData.prototype.set=function(k,v,fn){ this["delete"](k); this.__e.push([String(k),v,fn]); };
  FormData.prototype.get=function(k){ k=String(k); for(var i=0;i<this.__e.length;i++) if(this.__e[i][0]===k) return this.__e[i][1]; return null; };
  FormData.prototype.getAll=function(k){ k=String(k); var r=[]; for(var i=0;i<this.__e.length;i++) if(this.__e[i][0]===k) r.push(this.__e[i][1]); return r; };
  FormData.prototype.has=function(k){ return this.get(String(k))!==null; };
  FormData.prototype["delete"]=function(k){ k=String(k); this.__e=this.__e.filter(function(e){return e[0]!==k;}); };
  FormData.prototype.forEach=function(cb,t){ for(var i=0;i<this.__e.length;i++) cb.call(t,this.__e[i][1],this.__e[i][0],this); };
  FormData.prototype.entries=function(){ return this.__e.map(function(e){return [e[0],e[1]];}); };
  FormData.prototype.keys=function(){ return this.__e.map(function(e){return e[0];}); };
  FormData.prototype.values=function(){ return this.__e.map(function(e){return e[1];}); };
  g.FormData = FormData;

  // ---- Request / Response (data holders) ----
  function Request(input, init){ init=init||{}; this.url=(input&&input.url)?input.url:String(input); this.method=init.method||(input&&input.method)||"GET"; this.headers=new g.Headers(init.headers||(input&&input.headers)||{}); this.body=init.body!=null?init.body:(input&&input.body); this.__isRequest=true; }
  Request.prototype.clone=function(){ return new Request(this,{}); };
  g.Request = Request;
  function Response(body, init){ init=init||{}; this.__body=body==null?"":String(body); this.status=init.status!=null?init.status:200; this.statusText=init.statusText||""; this.ok=this.status>=200&&this.status<300; this.headers=new g.Headers(init.headers||{}); this.__isResponse=true; }
  Response.prototype.text=function(){ return Promise.resolve(this.__body); };
  Response.prototype.json=function(){ var b=this.__body; return Promise.resolve(JSON.parse(b)); };
  Response.prototype.arrayBuffer=function(){ return Promise.resolve(new Uint8Array(_u8(this.__body)).buffer); };
  g.Response = Response;

  // ---- fetch augmentation: Request input + FormData/Blob/URLSearchParams bodies ----
  var __origFetch = g.fetch;
  function _multipart(fd){
    var boundary = "----RQFormBoundary" + crypto.randomUUID().replace(/-/g,"");
    var CRLF = "\r\n", body = "";
    fd.__e.forEach(function(e){ var name=e[0], val=e[1], fn=e[2];
      body += "--"+boundary+CRLF;
      if(val && val.__isBlob){ body += 'Content-Disposition: form-data; name="'+name+'"'+(fn?'; filename="'+fn+'"':'')+CRLF; if(val.type) body+="Content-Type: "+val.type+CRLF; body+=CRLF+_s8(val.__bytes)+CRLF; }
      else { body += 'Content-Disposition: form-data; name="'+name+'"'+CRLF+CRLF+String(val)+CRLF; }
    });
    body += "--"+boundary+"--"+CRLF;
    return { body: body, contentType: "multipart/form-data; boundary="+boundary };
  }
  g.fetch = function(input, init){
    init = init || {};
    if (input instanceof Request){ init={ method: input.method, headers: input.headers, body: input.body }; input = input.url; }
    var body = init.body, headers = init.headers || {};
    if (body && body.__isBlob){ body = _s8(body.__bytes); }
    else if (body instanceof FormData){ var mp=_multipart(body); body=mp.body; var o={}; if(headers&&headers.forEach){ headers.forEach(function(v,k){o[k]=v;}); } else { for(var k in headers) o[k]=headers[k]; } o["content-type"]=mp.contentType; headers=o; }
    else if (body instanceof g.URLSearchParams){ body=body.toString(); var o2={}; for(var k2 in headers) o2[k2]=headers[k2]; if(!o2["content-type"]&&!o2["Content-Type"]) o2["content-type"]="application/x-www-form-urlencoded"; headers=o2; }
    var init2={}; for(var kk in init) init2[kk]=init[kk]; init2.body=body; init2.headers=headers;
    return __origFetch(input, init2);
  };

  // ---- XMLHttpRequest (async only; sync throws) over the fetch bridge ----
  function XMLHttpRequest(){ this.readyState=0; this.status=0; this.statusText=""; this.responseText=""; this.response=""; this.responseType=""; this._h={}; this._m="GET"; this._u=""; this._rh={}; this.onreadystatechange=null; this.onload=null; this.onerror=null; this.onloadend=null; }
  XMLHttpRequest.UNSENT=0; XMLHttpRequest.OPENED=1; XMLHttpRequest.HEADERS_RECEIVED=2; XMLHttpRequest.LOADING=3; XMLHttpRequest.DONE=4;
  XMLHttpRequest.prototype.open=function(method,url,async){ if(async===false) throw new Error("Synchronous XMLHttpRequest is not supported in sandboxed rules; use async or fetch()."); this._m=method||"GET"; this._u=String(url); this.readyState=1; if(this.onreadystatechange) this.onreadystatechange(); };
  XMLHttpRequest.prototype.setRequestHeader=function(k,v){ this._h[k]=v; };
  XMLHttpRequest.prototype.getAllResponseHeaders=function(){ var s=""; for(var k in this._rh) s+=k+": "+this._rh[k]+"\r\n"; return s; };
  XMLHttpRequest.prototype.getResponseHeader=function(k){ k=String(k).toLowerCase(); return (k in this._rh)?this._rh[k]:null; };
  XMLHttpRequest.prototype.abort=function(){};
  XMLHttpRequest.prototype.send=function(body){ var self=this;
    g.fetch(this._u,{ method:this._m, headers:this._h, body:body }).then(function(res){ self.status=res.status; self.statusText=res.statusText||""; self._rh={}; if(res.headers&&res.headers.forEach) res.headers.forEach(function(v,k){ self._rh[String(k).toLowerCase()]=v; }); return res.text(); })
      .then(function(text){ self.responseText=text; self.response=(self.responseType==="json")?(function(){try{return JSON.parse(text);}catch(e){return null;}})():text; self.readyState=4; if(self.onreadystatechange) self.onreadystatechange(); if(self.onload) self.onload(); if(self.onloadend) self.onloadend(); })
      .catch(function(e){ self.readyState=4; if(self.onreadystatechange) self.onreadystatechange(); if(self.onerror) self.onerror(e); if(self.onloadend) self.onloadend(); });
  };
  g.XMLHttpRequest = XMLHttpRequest;

  // ---- WebSocket: unsupported (a persistent connection can't outlive a per-request execution) ----
  g.WebSocket = function(){ throw new Error("WebSocket is not available in sandboxed rules (no persistent connections)."); };

  // ---- crypto: createHmac (node) + subtle.digest (webcrypto) ----
  var __nc = (function(){ try { return g.require("crypto"); } catch(e){ return null; } })();
  if (__nc){
    __nc.createHmac = function(algo, key){ var buf="";
      return { update:function(d){ buf+=String(d); return this; }, digest:function(enc){ return JSON.parse(__hostCrypto(JSON.stringify({op:"hmac",algo:algo,key:String(key),data:buf,encoding:enc||"hex"}))).digest; } };
    };
  }
  if (g.crypto && !g.crypto.subtle){
    g.crypto.subtle = {
      digest: function(algo, data){
        var name=(typeof algo==="string"?algo:(algo&&algo.name)||"SHA-256").toLowerCase().replace("-","");
        var bytes;
        if(typeof data==="string") bytes=_u8(data);
        else if(data instanceof ArrayBuffer) bytes=Array.prototype.slice.call(new Uint8Array(data));
        else if(data && data.buffer) bytes=Array.prototype.slice.call(new Uint8Array(data.buffer, data.byteOffset||0, data.byteLength));
        else bytes=Array.prototype.slice.call(data||[]);
        var hex=JSON.parse(__hostCrypto(JSON.stringify({op:"hash",algo:name,data:_toB64(bytes),dataEncoding:"base64",encoding:"hex"}))).digest;
        return Promise.resolve(new Uint8Array(_fromHex(hex)).buffer);
      }
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
`;
