class AmisuingMiddleware {
  constructor(is_active) {
    this.is_active = is_active;
  }

  on_request = async (ctx) => {
    if (!this.is_active) {
      return true;
    }

    Object.assign(ctx.proxyToServerRequestOptions.headers, {
      ["amiusingrequestly"]: "true",
    });
  };
}

export default AmisuingMiddleware;
