"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const circularQueue_1 = __importDefault(require("../../../utils/circularQueue"));
class ModifiedRequestsPool {
    constructor() {
        this.queue = new circularQueue_1.default(100);
    }
    add(url) {
        url = url.replace(/www\./g, "");
        this.queue.enQueue(url);
        //    logger.log(this.queue);
    }
    isURLModified(url) {
        if (!url)
            return false;
        // logger.log("Current Url : ", url);
        // logger.log(JSON.stringify(this.queue), "Looper");
        let tempUrl = url;
        if (url.endsWith("/")) {
            tempUrl = tempUrl.slice(0, tempUrl.length - 1);
        }
        else {
            tempUrl = tempUrl + "/";
        }
        // logger.log(tempUrl);
        return (this.queue.getElementIndex(url) >= 0 ||
            this.queue.getElementIndex(tempUrl) >= 0);
    }
}
const modifiedRequestsPool = new ModifiedRequestsPool();
exports.default = modifiedRequestsPool;
