"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certConfig = void 0;
exports.certConfig = {
    CERT_NAME: "RQProxyCA",
    CERT_VALIDITY: {
        // Number of days - before the current date - Keep minimum 1 to avoid 12am date change issues
        START_BEFORE: 1,
        // Number of days - after the current date - Keep minimum 1 to avoid 12am date change issues
        // CAUTION : Increasing this count might affect current app users
        END_AFTER: 365,
    },
};
