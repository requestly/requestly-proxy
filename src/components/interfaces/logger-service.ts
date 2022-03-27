interface ILoggerService {
    addLog: (log: any, requestHeaders: {}) => void;
}

export default ILoggerService;
