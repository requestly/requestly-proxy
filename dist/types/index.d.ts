export interface ProxyConfig {
    [x: string]: any;
    port: Number;
    certPath: String;
    rootCertPath: String;
    onCARegenerated?: Function;
}
export interface Rule {
    id: string;
}
export interface RuleGroup {
    id: String;
    status: String;
}
