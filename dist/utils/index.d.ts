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
export declare function executeUserFunction(ctx: any, functionString: string, args: any): Promise<any>;
