import Queue from "../../../utils/circularQueue";

class ModifiedRequestsPool {
  constructor() {
    this.queue = new Queue(100);
  }

  add(url) {
    url = url.replace(/www\./g, "");
    this.queue.enQueue(url);
    //    logger.log(this.queue);
  }

  isURLModified(url) {
    if (!url) return false;
    // logger.log("Current Url : ", url);
    // logger.log(JSON.stringify(this.queue), "Looper");

    let tempUrl = url;
    if (url.endsWith("/")) {
      tempUrl = tempUrl.slice(0, tempUrl.length - 1);
    } else {
      tempUrl = tempUrl + "/";
    }
    // logger.log(tempUrl);
    return (
      this.queue.getElementIndex(url) >= 0 ||
      this.queue.getElementIndex(tempUrl) >= 0
    );
  }
}

const modifiedRequestsPool = new ModifiedRequestsPool();

export default modifiedRequestsPool;
