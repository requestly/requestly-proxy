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
/**
 * The complete in-guest prelude, concatenated in dependency order. index.ts
 * appends the user-function wrapper after this.
 */
export declare const SANDBOX_PRELUDE: string;
