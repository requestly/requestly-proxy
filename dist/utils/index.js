"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEV_MODE_DOC_URL = exports.isValidFunctionString = exports.SandboxError = void 0;
exports.executeUserFunction = executeUserFunction;
exports.isSandboxCapabilityError = isSandboxCapabilityError;
const quickjs_singlefile_cjs_release_sync_1 = __importDefault(require("@jitl/quickjs-singlefile-cjs-release-sync"));
// Import from quickjs-emscripten-core (lean, bring-your-own-variant) rather than
// the umbrella `quickjs-emscripten`: the umbrella's auto-loader statically
// references every WASM variant package, which a bundler (the desktop's webpack)
// tries to resolve and fails on. core + our single embedded variant is
// bundler-safe. (Same dependency choice as @requestly/sandbox-node.)
const quickjs_emscripten_core_1 = require("quickjs-emscripten-core");
const crypto_1 = require("crypto");
const util_1 = require("util");
const dns_1 = require("dns");
const net_1 = require("net");
// DEV-mode (opt-in) only: captures host console output for the legacy executor.
const capture_console_logs_1 = __importDefault(require("capture-console-logs"));
const Sentry = __importStar(require("@sentry/browser"));
const state_1 = __importDefault(require("../components/proxy-middleware/middlewares/state"));
class SandboxError extends Error {
    constructor(message, kind) {
        super(message);
        this.name = "SandboxError";
        this.kind = kind;
    }
}
exports.SandboxError = SandboxError;
/** Read a QuickJS error handle out as a host string (best-effort: name + message). */
function dumpError(vm, handle) {
    var _a;
    try {
        const d = vm.dump(handle);
        if (d && typeof d === "object") {
            return String((d.name ? d.name + ": " : "") + ((_a = d.message) !== null && _a !== void 0 ? _a : JSON.stringify(d)));
        }
        return String(d);
    }
    catch (_b) {
        return "unknown sandbox error";
    }
}
/**
 * Host-side visibility for sandbox failures (previously these were swallowed).
 * `prelude`/`timeout` are OUR problem → always report to Sentry; `user` is the
 * rule author's → console only, to avoid telemetry noise. Sentry is wrapped
 * because it may be uninitialised in this context (CLI/tests).
 */
function reportSandboxError(kind, message) {
    // TEMP (debug visibility — remove once Sentry capture is confirmed): surface
    // EVERY sandbox failure to the host console so it's readable outside the sandbox
    // (background-renderer DevTools). Greppable marker: "RQ-SANDBOX-ERROR".
    // eslint-disable-next-line no-console
    console.error("🔴 RQ-SANDBOX-ERROR [" + kind + "] →", message);
    if (kind === "user")
        return;
    try {
        Sentry.captureException(new Error("[rq-sandbox:" + kind + "] " + message), {
            tags: { sandbox: kind },
        });
    }
    catch (_a) {
        /* Sentry not initialised — the console.error above is the fallback */
    }
}
const sandbox_globals_1 = require("./sandbox-globals");
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
 * back.
 *
 * Web-API compatibility (so existing rule scripts don't break): `URL`,
 * `URLSearchParams`, `TextEncoder`/`TextDecoder`, `structuredClone`, `atob`/`btoa`
 * are pure in-guest JS shims (no host contact). `crypto` and `fetch` are HOST
 * BRIDGES — the guest calls a host function that does the real work with COPIED
 * data and returns copied data; no host object ever crosses the boundary, so the
 * isolation guarantee is unchanged (see __hostCrypto/__hostFetch below). `fetch`
 * uses the guest-promise + pump-loop pattern (works on the sync QuickJS variant;
 * avoids the asyncify teardown race). `require('crypto')` maps to the same bridge;
 * any other `require(...)` throws a guided error (fs/process/etc. stay absent).
 */
const EXEC_TIMEOUT_MS = 5000; // per-step CPU/interrupt deadline (sync guest bursts)
const OVERALL_TIMEOUT_MS = 15000; // wall-clock cap incl. async host I/O (fetch)
const FETCH_TIMEOUT_MS = 10000; // per fetch() call
const MAX_FETCH_BODY_BYTES = 25 * 1024 * 1024;
const MAX_CONCURRENT_FETCHES = 6; // simultaneous host fetches per execution
const MAX_TOTAL_FETCHES = 50; // total host fetches per execution
const MEMORY_LIMIT_BYTES = 128 * 1024 * 1024;
const MAX_STACK_BYTES = 2 * 1024 * 1024;
// The WASM module is expensive to instantiate; build it once and reuse across
// executions. A fresh QuickJS *context* is created per execution for isolation.
let modulePromise = null;
function getQuickJSModule() {
    if (!modulePromise) {
        modulePromise = (0, quickjs_emscripten_core_1.newQuickJSWASMModuleFromVariant)(quickjs_singlefile_cjs_release_sync_1.default);
    }
    return modulePromise;
}
/**
 * Serializes the `$sharedState` read-modify-write across ALL code-rule executions
 * (both safe and dev). Each executor holds this lock from the moment it snapshots
 * `$sharedState` until it writes the mutated copy back, so two concurrent rules can
 * never read the same version and then clobber each other's writes (last-writer-wins
 * data loss). Trade-off: a code rule that does host I/O (fetch/timers) holds the lock
 * for that I/O, so heavily-concurrent fetching rules run serially — correctness over
 * throughput. The lock is always released in a `finally`, so a throwing/timing-out
 * rule can't wedge the queue.
 */
let sharedStateChain = Promise.resolve();
function acquireSharedStateLock() {
    let release;
    const nextGate = new Promise((resolve) => {
        release = resolve;
    });
    const wait = sharedStateChain;
    sharedStateChain = sharedStateChain.then(() => nextGate);
    return wait.then(() => release);
}
/**
 * Verify a rule's code string parses WITHOUT executing it. Constructing
 * `new Function(body)` compiles/parses the body but never runs it (the function
 * is never called), so even an IIFE-shaped string cannot execute here. Avoids the
 * `vm` module (unsupported in Electron's renderer); the sandboxed execution
 * happens inside QuickJS.
 */
const isValidFunctionString = async function (functionStringEscaped) {
    try {
        // eslint-disable-next-line no-new, no-new-func
        new Function(`return (${functionStringEscaped}\n);`);
        return true;
    }
    catch (_a) {
        return false;
    }
};
exports.isValidFunctionString = isValidFunctionString;
// ── host-side bridge handlers ── only copied data crosses the boundary.
/** Real crypto via the host's node:crypto. Input/output are plain JSON values. */
function hostCryptoOp(req) {
    switch (req === null || req === void 0 ? void 0 : req.op) {
        case "randomUUID":
            return { uuid: (0, crypto_1.randomUUID)() };
        case "randomBytes": {
            const n = Math.max(0, Math.min(65536, Number(req.size) | 0));
            return { bytes: Array.from((0, crypto_1.randomBytes)(n)) };
        }
        case "hash": {
            const enc = req.encoding === "base64" ? "base64" : "hex";
            const data = Buffer.from(String(req.data), req.dataEncoding === "base64" ? "base64" : "utf8");
            return {
                digest: (0, crypto_1.createHash)(String(req.algo || "sha256"))
                    .update(data)
                    .digest(enc),
            };
        }
        case "hmac": {
            const enc = req.encoding === "base64" ? "base64" : "hex";
            const key = Buffer.from(String(req.key), req.keyEncoding === "base64" ? "base64" : "utf8");
            const data = Buffer.from(String(req.data), req.dataEncoding === "base64" ? "base64" : "utf8");
            return {
                digest: (0, crypto_1.createHmac)(String(req.algo || "sha256"), key)
                    .update(data)
                    .digest(enc),
            };
        }
        default:
            throw new Error("unsupported crypto op");
    }
}
/**
 * True for loopback / private / link-local / CGNAT / multicast / reserved
 * addresses — i.e. destinations a (potentially shared) rule must not be able to
 * reach via the sandbox fetch bridge. Covers the cloud-metadata endpoint
 * (169.254.169.254) and IPv4-mapped IPv6. A malformed IPv4 literal is treated as
 * unsafe (fail-closed).
 */
function isPrivateAddress(ip) {
    const kind = (0, net_1.isIP)(ip);
    if (kind === 0)
        return false; // not an IP literal — caller resolves it first
    if (kind === 4) {
        const parts = ip.split(".").map((n) => Number(n));
        if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
            return true; // malformed → fail closed
        }
        const [a, b] = parts;
        if (a === 0)
            return true; // "this" network / unspecified
        if (a === 10)
            return true; // 10.0.0.0/8
        if (a === 127)
            return true; // loopback
        if (a === 169 && b === 254)
            return true; // link-local incl. cloud metadata
        if (a === 172 && b >= 16 && b <= 31)
            return true; // 172.16.0.0/12
        if (a === 192 && b === 168)
            return true; // 192.168.0.0/16
        if (a === 100 && b >= 64 && b <= 127)
            return true; // CGNAT 100.64.0.0/10
        if (a >= 224)
            return true; // multicast / reserved / broadcast
        return false;
    }
    // IPv6
    const v6 = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (v6 === "::1" || v6 === "::")
        return true; // loopback / unspecified
    if (v6.startsWith("fe80"))
        return true; // link-local
    if (v6.startsWith("fc") || v6.startsWith("fd"))
        return true; // unique-local fc00::/7
    if (v6.startsWith("ff"))
        return true; // multicast
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (mapped)
        return isPrivateAddress(mapped[1]);
    return false;
}
/**
 * SSRF guard for the sandbox fetch bridge. Rejects a destination that is (or
 * resolves to) an internal address. `credentials: 'omit'` is not enough on its
 * own — a shared/imported rule could otherwise probe localhost, private networks,
 * or the cloud-metadata endpoint. Literal-IP hosts (incl. obfuscated forms that
 * `isIP` normalises) and `localhost` aliases are checked directly; hostnames are
 * DNS-resolved and rejected if ANY resolved address is internal.
 *
 * Residual (documented, not closed here): between this resolution and the actual
 * connection the platform makes its own DNS lookup, so a rebinding attacker with a
 * sub-timeout TTL flip is not fully prevented — that needs IP pinning via a custom
 * agent, which the host `fetch` in this environment does not expose. The final
 * response URL is re-validated by the caller as a second line of defence.
 */
async function assertPublicDestination(parsedUrl) {
    const host = parsedUrl.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
    if ((0, net_1.isIP)(host) !== 0) {
        if (isPrivateAddress(host)) {
            throw new Error("blocked: fetch to a private or internal address is not allowed");
        }
        return;
    }
    const lower = host.toLowerCase();
    if (lower === "localhost" || lower.endsWith(".localhost")) {
        throw new Error("blocked: fetch to a private or internal address is not allowed");
    }
    let resolved;
    try {
        resolved = await dns_1.promises.lookup(host, { all: true });
    }
    catch (_a) {
        throw new Error("blocked: could not resolve fetch destination host");
    }
    if (!resolved.length) {
        throw new Error("blocked: could not resolve fetch destination host");
    }
    for (const entry of resolved) {
        if (isPrivateAddress(entry.address)) {
            throw new Error("blocked: fetch to a private or internal address is not allowed");
        }
    }
}
/**
 * Read a fetch response body while enforcing the size cap INCREMENTALLY. Buffering
 * with `arrayBuffer()` first would allocate the whole (possibly huge) body before
 * the cap could apply, so we stream and abort the moment we cross the limit.
 */
async function readCappedBody(resp, controller) {
    var _a, _b;
    const stream = resp.body;
    if (!stream || typeof stream.getReader !== "function") {
        // No readable stream (or a non-standard fetch impl) — fall back to buffering
        // with a post-read cap check.
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.byteLength > MAX_FETCH_BODY_BYTES) {
            throw new Error("response body exceeds sandbox size limit");
        }
        return buf;
    }
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (!value)
                continue;
            total += (_b = (_a = value.byteLength) !== null && _a !== void 0 ? _a : value.length) !== null && _b !== void 0 ? _b : 0;
            if (total > MAX_FETCH_BODY_BYTES) {
                try {
                    controller.abort();
                }
                catch (_c) {
                    /* ignore */
                }
                throw new Error("response body exceeds sandbox size limit");
            }
            chunks.push(Buffer.from(value));
        }
    }
    finally {
        try {
            reader.releaseLock();
        }
        catch (_d) {
            /* ignore */
        }
    }
    return Buffer.concat(chunks, total);
}
/**
 * Real HTTP via the host's global fetch, bounded by a timeout + body-size cap and
 * an SSRF policy. Policy: http(s) URLs only (no file:/ftp:/data: etc.),
 * `credentials: 'omit'` so a (potentially shared) rule cannot ride the user's
 * ambient cookies/sessions, and both the initial destination AND the final
 * (post-redirect) response URL must be public — the latter neutralises a public
 * URL that redirects to the cloud-metadata endpoint. The AbortController is
 * registered in `controllers` so the executor can cancel a fetch the rule started
 * but never awaited when the sandbox is torn down.
 */
async function hostFetchOp(req, controllers) {
    const hostFetch = globalThis.fetch;
    if (typeof hostFetch !== "function") {
        throw new Error("fetch is not available in this environment");
    }
    let parsedUrl;
    try {
        parsedUrl = new URL(String(req.url));
    }
    catch (_a) {
        throw new Error("Invalid URL");
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Only http and https URLs are allowed in sandboxed rules");
    }
    // SSRF guard — initial destination.
    await assertPublicDestination(parsedUrl);
    const controller = new AbortController();
    controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const resp = await hostFetch(parsedUrl.toString(), {
            method: req.method || "GET",
            headers: req.headers || {},
            body: req.body,
            signal: controller.signal,
            credentials: "omit",
        });
        // SSRF guard — final destination. If the platform followed a redirect to a
        // DIFFERENT host that is internal, refuse to hand its body back to the
        // (possibly shared) rule. Only re-checked on an actual cross-host redirect, so
        // the common no-redirect path pays no extra DNS lookup.
        if (resp.url) {
            let finalUrl = null;
            try {
                finalUrl = new URL(resp.url);
            }
            catch (_b) {
                finalUrl = null;
            }
            if (finalUrl &&
                finalUrl.hostname !== parsedUrl.hostname &&
                (finalUrl.protocol === "http:" || finalUrl.protocol === "https:")) {
                await assertPublicDestination(finalUrl);
            }
        }
        const bodyBuf = await readCappedBody(resp, controller);
        const headers = {};
        resp.headers.forEach((v, k) => {
            headers[k] = v;
        });
        return {
            status: resp.status,
            statusText: resp.statusText,
            ok: resp.ok,
            url: resp.url,
            headers,
            body: bodyBuf.toString("utf8"),
        };
    }
    finally {
        clearTimeout(timer);
        controllers.delete(controller);
    }
}
/* Expects that `functionString` has already been validated via isValidFunctionString. */
async function executeUserFunctionSandboxed(ctx, functionString, args) {
    var _a, _b, _c, _d, _e;
    let argsJson = "{}";
    try {
        argsJson = JSON.stringify(args !== null && args !== void 0 ? args : {});
    }
    catch (_f) {
        argsJson = "{}";
    }
    const QuickJS = await getQuickJSModule();
    // Hold the shared-state lock across the whole snapshot → execute → write-back so
    // a concurrent code rule can't read the same $sharedState version and then clobber
    // our write (see acquireSharedStateLock). Released in the finally below.
    const releaseSharedStateLock = await acquireSharedStateLock();
    // AbortControllers for host fetches this execution started, so the finally can
    // cancel any the rule never awaited before the VM is disposed.
    const fetchControllers = new Set();
    let vm = null;
    // Snapshot $sharedState now that the lock is held — no concurrent executor can
    // commit between this read and our write-back below.
    let sharedStateJson = "{}";
    try {
        sharedStateJson = JSON.stringify((_a = state_1.default.getInstance().getSharedStateCopy()) !== null && _a !== void 0 ? _a : {});
    }
    catch (_g) {
        sharedStateJson = "{}";
    }
    try {
        vm = QuickJS.newContext();
        vm.runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
        vm.runtime.setMaxStackSize(MAX_STACK_BYTES);
        // Hard wall-clock cap — interrupts infinite loops (sync and inside microtasks).
        vm.runtime.setInterruptHandler((0, quickjs_emscripten_core_1.shouldInterruptAfterDeadline)(Date.now() + EXEC_TIMEOUT_MS));
        // Inject inputs as primitive strings (parsed into objects inside the sandbox).
        const argsHandle = vm.newString(argsJson);
        vm.setProp(vm.global, "__argsJson", argsHandle);
        argsHandle.dispose();
        const sharedHandle = vm.newString(sharedStateJson);
        vm.setProp(vm.global, "__sharedStateJson", sharedHandle);
        sharedHandle.dispose();
        // In-flight async host calls (fetch, timers) the pump loop must await before
        // the guest's await-chain can progress.
        const inflight = [];
        // Wall-clock cap for the whole execution (incl. async host I/O + timer waits).
        // Declared here so the timer bridge can clamp delays to the remaining budget.
        const overallDeadline = Date.now() + OVERALL_TIMEOUT_MS;
        // crypto bridge — SYNC: a JSON string in, a JSON string out.
        const cryptoFn = vm.newFunction("__hostCrypto", (reqHandle) => {
            let out;
            try {
                out = JSON.stringify(hostCryptoOp(JSON.parse(vm.getString(reqHandle))));
            }
            catch (e) {
                out = JSON.stringify({ error: String((e && e.message) || e) });
            }
            return vm.newString(out);
        });
        vm.setProp(vm.global, "__hostCrypto", cryptoFn);
        cryptoFn.dispose();
        // fetch bridge — ASYNC via guest promise: return a pending guest Promise now,
        // resolve it with the copied response once the real host fetch settles. The
        // resolve is guarded so a late settle after a timeout/dispose can't throw.
        //
        // Bounded so a rule can't exhaust the host: at most MAX_TOTAL_FETCHES calls per
        // execution (hard reject beyond that) and at most MAX_CONCURRENT_FETCHES running
        // at once (excess queue on a slot). The slot count only changes synchronously, so
        // it never transiently exceeds the cap. Slots are handed directly to the next
        // waiter on release, so the count is a true in-flight gauge.
        let totalFetches = 0;
        let activeFetches = 0;
        const fetchWaiters = [];
        const acquireFetchSlot = () => {
            if (activeFetches < MAX_CONCURRENT_FETCHES) {
                activeFetches++;
                return Promise.resolve();
            }
            return new Promise((resolve) => fetchWaiters.push(resolve));
        };
        const releaseFetchSlot = () => {
            const next = fetchWaiters.shift();
            if (next)
                next(); // hand the slot over without changing the count
            else
                activeFetches = Math.max(0, activeFetches - 1);
        };
        const fetchFn = vm.newFunction("__hostFetch", (reqHandle) => {
            const req = JSON.parse(vm.getString(reqHandle));
            const deferred = vm.newPromise();
            const settle = (payload) => {
                try {
                    const h = vm.newString(payload);
                    deferred.resolve(h);
                    h.dispose();
                }
                catch (_a) {
                    /* context disposed (overall timeout) — drop the result */
                }
            };
            totalFetches++;
            if (totalFetches > MAX_TOTAL_FETCHES) {
                settle(JSON.stringify({
                    __fetchError: "sandbox fetch limit exceeded (" + MAX_TOTAL_FETCHES + " per rule execution)",
                }));
                return deferred.handle;
            }
            inflight.push((async () => {
                await acquireFetchSlot();
                let payload;
                try {
                    payload = JSON.stringify(await hostFetchOp(req, fetchControllers));
                }
                catch (e) {
                    payload = JSON.stringify({ __fetchError: String((e && e.message) || e) });
                }
                finally {
                    releaseFetchSlot();
                }
                settle(payload);
            })());
            return deferred.handle;
        });
        vm.setProp(vm.global, "__hostFetch", fetchFn);
        fetchFn.dispose();
        // timer bridge — ASYNC via guest promise: honors the real `ms` delay using a
        // host timer, so setTimeout-based backoff/retry actually waits (not a no-delay
        // microtask). Clamped to the remaining wall-clock budget so a timer can never
        // outlast the execution; the pump loop awaits it like any in-flight host call.
        const timerFn = vm.newFunction("__hostTimer", (msHandle) => {
            let ms = Number(vm.dump(msHandle));
            if (!Number.isFinite(ms) || ms < 0)
                ms = 0;
            ms = Math.min(ms, Math.max(0, overallDeadline - Date.now()));
            const deferred = vm.newPromise();
            inflight.push(new Promise((resolve) => {
                setTimeout(() => {
                    try {
                        deferred.resolve(vm.undefined);
                    }
                    catch (_a) {
                        /* context disposed (overall timeout) — drop it */
                    }
                    resolve();
                }, ms);
            }));
            return deferred.handle;
        });
        vm.setProp(vm.global, "__hostTimer", timerFn);
        timerFn.dispose();
        // The user fn is appended after a newline so a trailing '//' comment can't
        // swallow the marshaling code. Result (or error) + console + $sharedState are
        // serialized into the __OUTPUT global, which we read back on the host side.
        // 1) Eval our prelude (shims) ON ITS OWN. An error here is OUR bug, not the
        //    rule author's — dump + report it instead of swallowing it as a generic 187.
        const preludeResult = vm.evalCode(sandbox_globals_1.SANDBOX_PRELUDE);
        if (preludeResult.error) {
            const msg = dumpError(vm, preludeResult.error);
            preludeResult.error.dispose();
            reportSandboxError("prelude", msg);
            throw new SandboxError(msg, "prelude");
        }
        preludeResult.value.dispose();
        // 2) Eval the user fn wrapper. Running the fn inside a `.then` turns a SYNC
        //    throw into a rejection, so it is captured by `.catch` (→ __OUTPUT.error)
        //    exactly like an async throw — instead of leaking out as a top-level eval
        //    error that we'd lose.
        const userProgram = "Promise.resolve().then(function () { return (" +
            functionString +
            "\n)(args); }).then(function (r) {" +
            "  var out;" +
            "  if (r === undefined || r === null) { out = r; }" +
            '  else if (typeof r === "object") { out = JSON.stringify(r); }' +
            "  else { out = r; }" +
            "  __OUTPUT = JSON.stringify({ result: out, sharedState: $sharedState, logs: __logs });" +
            "}).catch(function (e) {" +
            "  __OUTPUT = JSON.stringify({ error: String((e && e.message) || e), logs: __logs });" +
            "});";
        const userEval = vm.evalCode(userProgram);
        if (userEval.error) {
            // Setting up the chain itself failed (e.g. a syntax issue isValidFunctionString
            // missed). Surface the real message rather than dropping it.
            const msg = dumpError(vm, userEval.error);
            userEval.error.dispose();
            reportSandboxError("user", msg);
            throw new SandboxError(msg, "user");
        }
        userEval.value.dispose();
        // Pump loop — drive the user fn's promise chain, including real async host
        // I/O (fetch). Re-arm the per-step CPU interrupt each iteration so a slow
        // network wait doesn't make a post-fetch sync burst trip the original
        // deadline; the overall wall-clock cap bounds total time. Repeat until the
        // top-level promise sets __OUTPUT, the deadline trips, or nothing is pending.
        let output;
        for (;;) {
            vm.runtime.setInterruptHandler((0, quickjs_emscripten_core_1.shouldInterruptAfterDeadline)(Date.now() + EXEC_TIMEOUT_MS));
            // On a job error / deadline interrupt the result carries a QuickJSHandle;
            // dispose it eagerly (vm.dispose() in finally would reclaim it too).
            const jobs = vm.runtime.executePendingJobs();
            if (jobs.error)
                jobs.error.dispose();
            const outHandle = vm.getProp(vm.global, "__OUTPUT");
            output = vm.dump(outHandle);
            outHandle.dispose();
            if (typeof output === "string")
                break; // settled
            if (Date.now() > overallDeadline)
                break; // timed out
            if (inflight.length === 0)
                break; // nothing pending → chain won't progress
            const batch = inflight.splice(0);
            await Promise.race([
                Promise.allSettled(batch),
                new Promise((r) => setTimeout(r, Math.max(0, overallDeadline - Date.now()))),
            ]);
        }
        if (typeof output !== "string") {
            // No __OUTPUT and nothing left to await → timed out / never settled.
            reportSandboxError("timeout", "rule execution timed out or never settled");
            throw new SandboxError("Execution timed out", "timeout");
        }
        let parsed;
        try {
            parsed = JSON.parse(output);
        }
        catch (_h) {
            // We control the marshaling, so malformed __OUTPUT is our bug.
            const msg = "sandbox produced invalid output";
            reportSandboxError("prelude", msg);
            throw new SandboxError(msg, "prelude");
        }
        if (((_b = parsed.logs) === null || _b === void 0 ? void 0 : _b.length) && ((_c = ctx === null || ctx === void 0 ? void 0 : ctx.rq) === null || _c === void 0 ? void 0 : _c.consoleLogs)) {
            ctx.rq.consoleLogs.push(...parsed.logs);
        }
        if (parsed.error) {
            // A CPU-deadline interrupt surfaces as a caught guest error ("interrupted") —
            // classify that as a timeout, not the rule author's logic error. Everything
            // else is a genuine user throw (sync or async), now surfaced (was swallowed).
            const interrupted = /interrupt/i.test(String(parsed.error));
            const kind = interrupted ? "timeout" : "user";
            const message = interrupted
                ? "Execution timed out (CPU limit)"
                : String(parsed.error);
            if ((_d = ctx === null || ctx === void 0 ? void 0 : ctx.rq) === null || _d === void 0 ? void 0 : _d.consoleLogs) {
                ctx.rq.consoleLogs.push({ type: "error", args: [message] });
            }
            reportSandboxError(kind, message);
            throw new SandboxError(message, kind);
        }
        // Write back any mutations the rule made to $sharedState.
        state_1.default.getInstance().setSharedState((_e = parsed.sharedState) !== null && _e !== void 0 ? _e : {});
        // Objects were JSON-stringified inside the sandbox, so result is a string
        // (or null/undefined) — mirrors the previous return contract.
        return parsed.result;
    }
    finally {
        // Cancel any host fetches the rule started but never awaited, so they can't
        // outlive the sandbox, then tear down the VM and release the shared-state lock.
        for (const c of fetchControllers) {
            try {
                c.abort();
            }
            catch (_j) {
                /* ignore */
            }
        }
        if (vm)
            vm.dispose();
        releaseSharedStateLock();
    }
}
/**
 * DEV MODE (opt-in, RQ-2426) — the LEGACY executor.
 *
 * Runs rule code via `new Function(...)` directly in the proxy's Node.js process,
 * exactly like the pre-sandbox behavior: the rule gets FULL host access
 * (require/process/fs/child_process). This is the maximum-flexibility path AND the
 * supply-chain RCE surface the sandbox exists to close, so it must only ever run
 * when the user has explicitly opted into dev mode (see `executeUserFunction`).
 *
 * Mirrors master's executeUserFunction: `$sharedState` is injected and written back,
 * console output is captured into `ctx.rq.consoleLogs`, promises are awaited, and
 * object results are JSON-stringified.
 */
async function executeUserFunctionLegacy(ctx, functionString, args) {
    var _a, _b, _c;
    // Make the reduced safety visible in the rule's own console output (shows up in
    // the app's rule-execution logs alongside the user's own console.* output).
    try {
        (_b = (_a = ctx === null || ctx === void 0 ? void 0 : ctx.rq) === null || _a === void 0 ? void 0 : _a.consoleLogs) === null || _b === void 0 ? void 0 : _b.push({
            type: "warn",
            args: [
                "⚠️ Requestly DEV script mode: this rule ran with FULL system access (no sandbox).",
            ],
        });
    }
    catch (_d) {
        /* consoleLogs unavailable (e.g. harness) — non-fatal */
    }
    // Hold the shared-state lock across snapshot → execute → write-back, same as the
    // safe executor, so concurrent code rules can't clobber each other's $sharedState.
    const releaseSharedStateLock = await acquireSharedStateLock();
    try {
        const SHARED_STATE_VAR_NAME = "$sharedState";
        const sharedState = state_1.default.getInstance().getSharedStateCopy();
        const { func: generatedFunction, updatedSharedState } = new Function(SHARED_STATE_VAR_NAME, `return { func: ${functionString}, updatedSharedState: ${SHARED_STATE_VAR_NAME}}`)(sharedState);
        const consoleCapture = new capture_console_logs_1.default();
        consoleCapture.start(true);
        let finalResponse;
        try {
            finalResponse = generatedFunction(args);
            if (util_1.types.isPromise(finalResponse)) {
                finalResponse = await finalResponse;
            }
        }
        finally {
            // Always restore the patched console — even if the rule threw synchronously or
            // its promise rejected — otherwise console interception leaks into later
            // requests (the capture globally monkey-patches console.*).
            consoleCapture.stop();
            const consoleLogs = consoleCapture.getCaptures();
            if ((_c = ctx === null || ctx === void 0 ? void 0 : ctx.rq) === null || _c === void 0 ? void 0 : _c.consoleLogs) {
                ctx.rq.consoleLogs.push(...consoleLogs);
            }
        }
        state_1.default.getInstance().setSharedState(updatedSharedState);
        if (typeof finalResponse === "object") {
            finalResponse = JSON.stringify(finalResponse);
        }
        return finalResponse;
    }
    finally {
        releaseSharedStateLock();
    }
}
/**
 * Entry point for executing a rule's "code" function. Dispatches strictly by mode:
 *   - dev  (options.devMode === true): legacy `new Function` — full host access.
 *   - safe (anything else, the default): QuickJS-WASM sandbox — no host access.
 *
 * The mode is supplied by the caller (derived from the proxy config / desktop
 * preference and stamped per-request); it is NEVER derived from rule content, so a
 * shared/imported rule cannot select its own execution mode.
 */
async function executeUserFunction(ctx, functionString, args, options = {}) {
    if (options.devMode === true) {
        return executeUserFunctionLegacy(ctx, functionString, args);
    }
    return executeUserFunctionSandboxed(ctx, functionString, args);
}
/** Public docs page explaining how to enable Developer Script Mode. */
exports.DEV_MODE_DOC_URL = "https://interceptor-docs.requestly.com/interceptor/desktop-app/developer-script-mode";
/**
 * True when a code-rule failure was caused by the SAFE sandbox blocking a host
 * capability (require of a module, `process`, etc.) — i.e. the kind of error the
 * user could resolve by enabling Developer Script Mode. Used to append a helpful
 * doc link to the surfaced error. Deliberately narrow so ordinary logic errors in
 * the rule don't get the dev-mode hint.
 */
function isSandboxCapabilityError(message) {
    return /not available in sandboxed rules|Cannot require\(|\b(?:process|module|__dirname|__filename|global)\b is not defined/i.test(String(message || ""));
}
