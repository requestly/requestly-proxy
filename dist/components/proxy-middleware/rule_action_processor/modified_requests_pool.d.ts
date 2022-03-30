export default modifiedRequestsPool;
declare const modifiedRequestsPool: ModifiedRequestsPool;
declare class ModifiedRequestsPool {
    queue: any;
    add(url: any): void;
    isURLModified(url: any): boolean;
}
