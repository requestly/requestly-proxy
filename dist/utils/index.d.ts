/**
 * Where a sandbox failure originated, so callers + telemetry can tell OUR
 * shim/infra bugs (`prelude`) from the rule author's (`user`) and timeouts apart.
 */
export type SandboxErrorKind = "prelude" | "user" | "timeout";
export declare class SandboxError extends Error {
    kind: SandboxErrorKind;
    constructor(message: string, kind: SandboxErrorKind);
}
/**
 * Verify a rule's code string parses WITHOUT executing it. Constructing
 * `new Function(body)` compiles/parses the body but never runs it (the function
 * is never called), so even an IIFE-shaped string cannot execute here. Avoids the
 * `vm` module (unsupported in Electron's renderer); the sandboxed execution
 * happens inside QuickJS.
 */
export declare const isValidFunctionString: (functionStringEscaped: string) => Promise<boolean>;
export interface ExecuteUserFunctionOptions {
    /**
     * When strictly `true`, run in DEV mode (legacy full-access `new Function`).
     * Any other value — false/undefined/null/non-boolean — runs the SAFE QuickJS
     * sandbox. Fail-safe: dev mode is never entered by accident.
     */
    devMode?: boolean;
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
export declare function executeUserFunction(ctx: any, functionString: string, args: any, options?: ExecuteUserFunctionOptions): Promise<any>;
/** Public docs page explaining how to enable Developer Script Mode. */
export declare const DEV_MODE_DOC_URL = "https://interceptor-docs.requestly.com/interceptor/desktop-app/developer-script-mode";
/**
 * True when a code-rule failure was caused by the SAFE sandbox blocking a host
 * capability (require of a module, `process`, etc.) — i.e. the kind of error the
 * user could resolve by enabling Developer Script Mode. Used to append a helpful
 * doc link to the surfaced error. Deliberately narrow so ordinary logic errors in
 * the rule don't get the dev-mode hint.
 */
export declare function isSandboxCapabilityError(message: string): boolean;
