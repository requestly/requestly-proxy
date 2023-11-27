export = CA;
declare class CA {
    onCARegenerated(callback: any): void;
    randomSerialNumber(): string;
    generateCA(callback: any): void;
    loadCA(callback: any): void;
    generateServerCertificateKeys(hosts: any, cb: any): void;
    getCACertPath(): string;
}
