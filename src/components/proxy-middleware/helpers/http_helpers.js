import charset from "charset";
import mime from "mime-types";


export const getEncoding = (contentTypeHeader, buffer) => {
  const encoding = charset(contentTypeHeader, buffer) || mime.charset(contentTypeHeader) || "utf8";
  return encoding;
}

export const bodyParser = (contentTypeHeader, buffer) => {
  const encoding = getEncoding(contentTypeHeader, buffer);
  try {
    return buffer.toString(encoding);
  } catch (error) {
    // some encodings are not supposed to be turned into string
    return buffer;
  }
}


export const getContentType = (contentTypeHeader) => {
  return contentTypeHeader?.split(";")[0] ?? null;
};

export const parseJsonBody = (data) => {
  try {
    return JSON.parse(data);
  } catch (e) {
    /* Body is still buffer array */
  }
  return data;
}
