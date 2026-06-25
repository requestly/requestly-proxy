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
export declare const SANDBOX_SETUP: string;
export declare const SANDBOX_POLYFILLS: string;
export declare const SANDBOX_BRIDGE_SHIMS: string;
export declare const SANDBOX_EXTRA_SHIMS: string;
