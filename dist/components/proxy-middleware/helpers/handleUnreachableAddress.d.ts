export function isAddressUnreachableError(host: any): Promise<any>;
export function isCertificateError(err: any): boolean;
export function certErrorToken(code: any): "ERR_CERT_DATE_INVALID" | "ERR_CERT_COMMON_NAME_INVALID" | "ERR_CERT_REVOKED" | "ERR_CERT_AUTHORITY_INVALID";
export function dataToServeCertErrorPage(host: any, code: any): {
    status: number;
    contentType: string;
    errorToken: string;
    body: string;
};
export function dataToServeUnreachablePage(host: any): {
    status: number;
    contentType: string;
    body: string;
};
