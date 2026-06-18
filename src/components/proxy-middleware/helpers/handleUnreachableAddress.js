import dns from 'dns';

export function isAddressUnreachableError(host) {
    return new Promise((resolve, reject) => {
        dns.lookup(host, (err, address) => {
            if (err) {
                if (err.code === 'ENOTFOUND') {
                    resolve(true);
                } else {
                    reject(err);
                }
            } else {
                resolve(false);
            }
        });
    });
}

// RQ-2425: upstream TLS certificate verification failures. These surface when
// "Allow insecure SSL in proxy interceptor" is OFF (the default) and the origin
// presents an untrusted/expired/self-signed cert. Without this, such failures
// were misreported as ERR_NAME_NOT_RESOLVED, which is confusing.
const TLS_CERT_ERROR_CODES = new Set([
    'CERT_HAS_EXPIRED',
    'CERT_NOT_YET_VALID',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'UNABLE_TO_GET_ISSUER_CERT',
    'CERT_UNTRUSTED',
    'CERT_REVOKED',
    'CERT_REJECTED',
    'HOSTNAME_MISMATCH',
    'ERR_TLS_CERT_ALTNAME_INVALID',
]);

export function isCertificateError(err) {
    if (!err) return false;
    if (err.code && TLS_CERT_ERROR_CODES.has(err.code)) return true;
    const message = String((err && (err.message || err.reason)) || '');
    return /\bcertificate\b/i.test(message) || /ERR_TLS_CERT/i.test(message);
}

// Maps a Node/OpenSSL cert error code to a Chrome-style token users recognise.
export function certErrorToken(code) {
    switch (code) {
        case 'CERT_HAS_EXPIRED':
        case 'CERT_NOT_YET_VALID':
            return 'ERR_CERT_DATE_INVALID';
        case 'HOSTNAME_MISMATCH':
        case 'ERR_TLS_CERT_ALTNAME_INVALID':
            return 'ERR_CERT_COMMON_NAME_INVALID';
        case 'CERT_REVOKED':
            return 'ERR_CERT_REVOKED';
        default:
            return 'ERR_CERT_AUTHORITY_INVALID';
    }
}

export function dataToServeCertErrorPage(host, code) {
    const token = certErrorToken(code);
    return {
        status: 502,
        contentType: 'text/html',
        errorToken: token,
        body: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${token}</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
    <style>
        body {
            background-color: #f2f2f2;
            color: #333;
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 100px auto;
            padding: 20px;
            text-align: center;
        }
        .sad-face {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 24px;
            font-weight: normal;
            margin-bottom: 10px;
        }
        p {
            font-size: 16px;
            color: #666;
        }
        code {
            background: #e8e8e8;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .container {
                margin-top: 50px;
                padding: 10px;
            }
            .sad-face {
                font-size: 60px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sad-face">:(</div>
        <h1>This site's SSL certificate isn't trusted</h1>
        <p>Requestly couldn't verify the TLS certificate of <strong>${host}</strong>${code ? ` (<code>${code}</code>)` : ''}.</p>
        <p>If you trust this host, enable <strong>“Allow insecure SSL in proxy interceptor”</strong> in Requestly desktop settings and reload.</p>
        <p><strong>${token}</strong></p>
    </div>
</body>
</html>
        `.trim()
    };
}

export function dataToServeUnreachablePage(host) {
    return {
        status: 502,
        contentType: 'text/html',
        body: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ERR_NAME_NOT_RESOLVED</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
    <style>
        body {
            background-color: #f2f2f2;
            color: #333;
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 100px auto;
            padding: 20px;
            text-align: center;
        }
        .sad-face {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 24px;
            font-weight: normal;
            margin-bottom: 10px;
        }
        p {
            font-size: 16px;
            color: #666;
        }
        @media (max-width: 600px) {
            .container {
                margin-top: 50px;
                padding: 10px;
            }
            .sad-face {
                font-size: 60px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sad-face">:(</div>
        <h1>This site can’t be reached</h1>
        <p>The webpage at <strong>${host}/</strong> might be temporarily down or it may have moved permanently to a new web address.</p>
        <p><strong>ERR_NAME_NOT_RESOLVED</strong></p>
    </div>
</body>
</html>
        `.trim()
    };
}