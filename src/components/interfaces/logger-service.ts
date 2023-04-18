import { DesktopNetworkLogEvent } from "../../types/proxy";

interface ILoggerService {
    sendLogEvent: (event: DesktopNetworkLogEvent, requestHeaders: {}) => void;
}

export default ILoggerService;
