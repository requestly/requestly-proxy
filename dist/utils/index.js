"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidFunctionString = void 0;
exports.executeUserFunction = executeUserFunction;
const quickjs_singlefile_cjs_release_sync_1 = __importDefault(require("@jitl/quickjs-singlefile-cjs-release-sync"));
const quickjs_emscripten_1 = require("quickjs-emscripten");
const state_1 = __importDefault(require("../components/proxy-middleware/middlewares/state"));
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
let modulePromise = null;
function getQuickJSModule() {
    if (!modulePromise) {
        modulePromise = (0, quickjs_emscripten_1.newQuickJSWASMModuleFromVariant)(quickjs_singlefile_cjs_release_sync_1.default);
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
/* Expects that `functionString` has already been validated via isValidFunctionString. */
async function executeUserFunction(ctx, functionString, args) {
    var _a, _b, _c, _d, _e;
    let argsJson = "{}";
    let sharedStateJson = "{}";
    try {
        argsJson = JSON.stringify(args !== null && args !== void 0 ? args : {});
    }
    catch (_f) {
        argsJson = "{}";
    }
    try {
        sharedStateJson = JSON.stringify((_a = state_1.default.getInstance().getSharedStateCopy()) !== null && _a !== void 0 ? _a : {});
    }
    catch (_g) {
        sharedStateJson = "{}";
    }
    const QuickJS = await getQuickJSModule();
    const vm = QuickJS.newContext();
    try {
        vm.runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
        vm.runtime.setMaxStackSize(MAX_STACK_BYTES);
        // Hard wall-clock cap — interrupts infinite loops (sync and inside microtasks).
        vm.runtime.setInterruptHandler((0, quickjs_emscripten_1.shouldInterruptAfterDeadline)(Date.now() + EXEC_TIMEOUT_MS));
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
        const program = SANDBOX_SETUP +
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
        // Resolve the user fn's (possibly async-but-IO-free) promise microtasks.
        vm.runtime.executePendingJobs();
        const outHandle = vm.getProp(vm.global, "__OUTPUT");
        const output = vm.dump(outHandle);
        outHandle.dispose();
        if (typeof output !== "string") {
            // Promise never settled (e.g. unsupported real async) → no modification.
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
