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