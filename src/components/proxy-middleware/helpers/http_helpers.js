import charset from "charset";
import mime from "mime-types";

import {fileTypeFromBuffer} from "file-type";

function getMimeTypeFromArrayBuffer(arrayBuffer) {
  const uint8arr = new Uint8Array(arrayBuffer)

  const len = 4
  if (uint8arr.length >= len) {
    let signatureArr = new Array(len)
    for (let i = 0; i < len; i++)
      signatureArr[i] = (new Uint8Array(arrayBuffer))[i].toString(16)
    const signature = signatureArr.join('').toUpperCase()

    switch (signature) {
      case '89504E47':
        return 'image/png'
      case '47494638':
        return 'image/gif'
      case '25504446':
        return 'application/pdf'
      case 'FFD8FFDB':
      case 'FFD8FFE0':
        return 'image/jpeg'
      case '504B0304':
        return 'application/zip'
      default:
        return null
    }
  }
  return null
}

export function getFileType (arrayBuffer) {
  return fileTypeFromBuffer(arrayBuffer)
}
export const bodyParser = (contentTypeHeader, buffer) => {
  let inherentEncoding =
    charset(contentTypeHeader) || mime.charset(contentTypeHeader);

  // let contentEncoding = 
  let str_buffer = null;
  const isEncodingValid = (givenEncoding) =>
    givenEncoding && Buffer.isEncoding(givenEncoding);
  const setBufferString = (givenEncoding) =>
    (str_buffer = buffer.toString(givenEncoding));

  if (isEncodingValid(inherentEncoding)) {
    setBufferString(inherentEncoding);
  } else {
    const mostCommonEncodings = [
      "utf8", // utf8 can also decode ASCII to ISO-8859-1, which is also very widely used
      "utf16le",
      "ascii",
      "ucs2",
      "base64",
      "latin1",
      "binary",
      "hex",
    ];
    mostCommonEncodings.every((newPossibleEncoding) => {
      if (isEncodingValid(newPossibleEncoding)) {
        setBufferString(newPossibleEncoding);
        return false;
      }
    });
  }

  return str_buffer;
};

export const getContentType = (contentTypeHeader) => {
  if (!contentTypeHeader) {
    return null;
  }

  let contentType = null;
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
  contentType = contentTypeHeader.split(";")[0];
  return contentType;
};

export const parseJsonBody = (data) => {
  try {
    return JSON.parse(data);
  } catch (e) {
    /* Body is still buffer array */
  }
  return data;
}
