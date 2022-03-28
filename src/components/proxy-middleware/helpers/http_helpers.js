import charset from "charset";
import mime from "mime-types";

export const bodyParser = (contentTypeHeader, buffer) => {
  const encoding =
    charset(contentTypeHeader) || mime.charset(contentTypeHeader);
  let str_buffer = null;

  if (encoding && Buffer.isEncoding(encoding)) {
    str_buffer = buffer.toString(encoding);
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
