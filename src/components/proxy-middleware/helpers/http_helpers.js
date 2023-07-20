import charset from "charset";
import mime from "mime-types";

export const bodyParser = (contentTypeHeader, buffer) => {
  let inherentEncoding =
    charset(contentTypeHeader) || mime.charset(contentTypeHeader);
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


  /* 
   FOLLOWING IS HOW API CLIENT PARSES THE BODY 
   much simpler than above, but requires thorough testing
  */
  // // todo: add support for other content types
  // let parsedResponse;
  // if (contentTypeHeader?.includes("image/")) {
  //   const raw = Buffer.from(buffer).toString("base64");
  //   parsedResponse = `data:${contentTypeHeader};base64,${raw}`;
  // } else {
  //   parsedResponse = new TextDecoder().decode(buffer);
  // }

  // return parsedResponse;

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
