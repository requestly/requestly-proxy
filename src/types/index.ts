export interface ProxyConfig {
    [x: string]: any;
    port: Number;
    certPath: String;
    rootCertPath: String;
    onCARegenerated?: Function;
    // RQ-2425: when true, the proxy skips upstream TLS certificate verification
    // (for self-signed / internal upstreams). Defaults to false (verify) when unset.
    allowInsecureCerts?: boolean;
    // RQ-2426: script-execution mode for "code" rules.
    //   false / unset  → SAFE (default): rule code runs in the QuickJS-WASM sandbox
    //                    (no host access — require/process/fs absent).
    //   true           → DEV (opt-in): rule code runs via legacy `new Function()` in
    //                    the proxy's Node process with FULL host access. This is the
    //                    RCE surface the sandbox closes, so it is off unless the user
    //                    explicitly enables it. Only an explicit `true` enables dev
    //                    mode; any other value (unset/null/junk) fails safe.
    devScriptMode?: boolean;
}

export interface Rule {
    id: string;
}

export interface RuleGroup {
    id: String;
    status: String;
}
