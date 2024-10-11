"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFunctionFromString = void 0;
exports.executeUserFunction = executeUserFunction;
const util_1 = require("util");
const capture_console_logs_1 = __importDefault(require("capture-console-logs"));
const state_1 = __importDefault(require("../components/proxy-middleware/middlewares/state"));
// Only used for verification now. For execution, we regenerate the function in executeUserFunction with the sharedState
const getFunctionFromString = function (functionStringEscaped) {
    return new Function(`return ${functionStringEscaped}`)();
};
exports.getFunctionFromString = getFunctionFromString;
/* Expects that the functionString has already been validated to be representing a proper function */
async function executeUserFunction(ctx, functionString, args) {
    const generateFunctionWithSharedState = function (functionStringEscaped) {
        const SHARED_STATE_VAR_NAME = "$sharedState";
        const sharedState = state_1.default.getInstance().getSharedStateCopy();
        return new Function(`${SHARED_STATE_VAR_NAME}`, `return { func: ${functionStringEscaped}, updatedSharedState: ${SHARED_STATE_VAR_NAME}}`)(sharedState);
    };
    const { func: generatedFunction, updatedSharedState } = generateFunctionWithSharedState(functionString);
    const consoleCapture = new capture_console_logs_1.default();
    consoleCapture.start(true);
    let finalResponse = generatedFunction(args);
    if (util_1.types.isPromise(finalResponse)) {
        finalResponse = await finalResponse;
    }
    consoleCapture.stop();
    const consoleLogs = consoleCapture.getCaptures();
    ctx.rq.consoleLogs.push(...consoleLogs);
    /**
     * If we use GlobalState.getSharedStateRef instead of GlobalState.getSharedStateCopy
     * then this update is completely unnecessary.
     * Because then the function gets a reference to the global states,
     * and any changes made inside the userFunction will directly be reflected there.
     *
     * But we are using it here to make the data flow obvious as we read this code.
     */
    state_1.default.getInstance().setSharedState(updatedSharedState);
    if (typeof finalResponse === "object") {
        finalResponse = JSON.stringify(finalResponse);
    }
    return finalResponse;
}
