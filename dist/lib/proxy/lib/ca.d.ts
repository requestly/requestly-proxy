export = CA;
declare class CA {
    randomSerialNumber(): string;
    generateCA(callback: any): void;
    loadCA(callback: any): void;
    generateServerCertificateKeys(hosts: any, cb: any): void;
    getCACertPath(): string;
}
