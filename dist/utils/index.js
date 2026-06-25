"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidFunctionString = void 0;
exports.executeUserFunction = executeUserFunction;
const quickjs_singlefile_cjs_release_sync_1 = __importDefault(require("@jitl/quickjs-singlefile-cjs-release-sync"));
// Import from quickjs-emscripten-core (lean, bring-your-own-variant) rather than
// the umbrella `quickjs-emscripten`: the umbrella's auto-loader statically
// references every WASM variant package, which a bundler (the desktop's webpack)
// tries to resolve and fails on. core + our single embedded variant is
// bundler-safe. (Same dependency choice as @requestly/sandbox-node.)
const quickjs_emscripten_core_1 = require("quickjs-emscripten-core");
const crypto_1 = require("crypto");
const state_1 = __importDefault(require("../components/proxy-middleware/middlewares/state"));
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
 * Real HTTP via the host's global fetch, bounded by a timeout + body-size cap.
 * Policy: http(s) URLs only (no file:/ftp:/data: etc.), and `credentials: 'omit'`
 * so a (potentially shared) rule cannot ride the user's ambient cookies/sessions.
 */
async function hostFetchOp(req) {
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const resp = await hostFetch(parsedUrl.toString(), {
            method: req.method || "GET",
            headers: req.headers || {},
            body: req.body,
            signal: controller.signal,
            credentials: "omit",
        });
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > MAX_FETCH_BODY_BYTES) {
            throw new Error("response body exceeds sandbox size limit");
        }
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
            body: Buffer.from(buf).toString("utf8"),
        };
    }
    finally {
        clearTimeout(timer);
    }
}
/* Expects that `functionString` has already been validated via isValidFunctionString. */
async function executeUserFunction(ctx, functionString, args) {
    var _a, _b, _c, _d, _e;
    let argsJson = "{}";
    try {
        argsJson = JSON.stringify(args !== null && args !== void 0 ? args : {});
    }
    catch (_f) {
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
        sharedStateJson = JSON.stringify((_a = state_1.default.getInstance().getSharedStateCopy()) !== null && _a !== void 0 ? _a : {});
    }
    catch (_g) {
        sharedStateJson = "{}";
    }
    const vm = QuickJS.newContext();
    try {
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
        const fetchFn = vm.newFunction("__hostFetch", (reqHandle) => {
            const req = JSON.parse(vm.getString(reqHandle));
            const deferred = vm.newPromise();
            inflight.push((async () => {
                let payload;
                try {
                    payload = JSON.stringify(await hostFetchOp(req));
                }
                catch (e) {
                    payload = JSON.stringify({ __fetchError: String((e && e.message) || e) });
                }
                try {
                    const h = vm.newString(payload);
                    deferred.resolve(h);
                    h.dispose();
                }
                catch (_a) {
                    /* context disposed (overall timeout) — drop the result */
                }
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
        const program = sandbox_globals_1.SANDBOX_PRELUDE +
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
        evalResult.value.dispose();
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
            // Promise never settled (timeout / never-resolving await) → no modification.
            return undefined;
        }
        let parsed;
        try {
            parsed = JSON.parse(output);
        }
        catch (_h) {
            return undefined;
        }
        if (((_b = parsed.logs) === null || _b === void 0 ? void 0 : _b.length) && ((_c = ctx === null || ctx === void 0 ? void 0 : ctx.rq) === null || _c === void 0 ? void 0 : _c.consoleLogs)) {
            ctx.rq.consoleLogs.push(...parsed.logs);
        }
        if (parsed.error) {
            if ((_d = ctx === null || ctx === void 0 ? void 0 : ctx.rq) === null || _d === void 0 ? void 0 : _d.consoleLogs) {
                ctx.rq.consoleLogs.push({ type: "error", args: [String(parsed.error)] });
            }
            return undefined;
        }
        // Write back any mutations the rule made to $sharedState.
        state_1.default.getInstance().setSharedState((_e = parsed.sharedState) !== null && _e !== void 0 ? _e : {});
        // Objects were JSON-stringified inside the sandbox, so result is a string
        // (or null/undefined) — mirrors the previous return contract.
        return parsed.result;
    }
    finally {
        vm.dispose();
    }
}
