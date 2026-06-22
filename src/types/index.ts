export interface ProxyConfig {
    [x: string]: any;
    port: Number;
    certPath: String;
    rootCertPath: String;
    onCARegenerated?: Function;
    // RQ-2425: when true, the proxy skips upstream TLS certificate verification
    // (for self-signed / internal upstreams). Defaults to false (verify) when unset.
    allowInsecureCerts?: boolean;
}

export interface Rule {
    id: string;
}

export interface RuleGroup {
    id: String;
    status: String;
}
