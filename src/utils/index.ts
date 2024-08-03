import { types } from "util";
import ConsoleCapture from "capture-console-logs";

// currently expecting sharedState to be copy NOT a reference. For use with the function below
export const getFunctionFromString = function (functionStringEscaped, sharedState = {}) {
    return new Function("sharedState", `return { func: ${functionStringEscaped}, sharedState}`)(sharedState);
};


// to execute the function generated above
export async function executeUserFunction(ctx, generatedFunction, args, sharedState) {

    const consoleCapture = new ConsoleCapture()
    consoleCapture.start(true)

    let finalResponse = generatedFunction(args);

    if (types.isPromise(finalResponse)) {
      finalResponse = await finalResponse;
    }

    consoleCapture.stop()
    const consoleLogs = consoleCapture.getCaptures()
    
    ctx.rq.consoleLogs.push(...consoleLogs)

    /**
     * If we use GlobalState.getSharedStateRef instead of GlobalState.getSharedStateCopy
     * then this update is completely unnecessary. 
     * Because then the function gets a reference to the global states,
     * and any changes made inside the userFunction will directly be reflected there.
     * 
     * But we are using it here to ensure that the logic is obvious when we read the code.
     */
    console.log("DBG: customGlobalState", JSON.stringify(ctx.customGlobalState, null, 2));
    ctx.customGlobalState?.setSharedState(sharedState);

    if (typeof finalResponse === "object") {
        finalResponse = JSON.stringify(finalResponse);
      }

    return finalResponse;
}