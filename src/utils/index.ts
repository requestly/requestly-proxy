import { types } from "util";
import ConsoleCapture from "capture-console-logs";
import GlobalStateProvider from "../components/proxy-middleware/middlewares/state";

// Only used for verification now. For execution, we regenerate the function in executeUserFunction with the sharedState
export const getFunctionFromString = function (functionStringEscaped) {
    return new Function(`return ${functionStringEscaped}`)();
};


/* Expects that the functionString has already been validated to be representing a proper function */
export async function executeUserFunction(ctx, functionString: string, args) {
    const generateFunctionWithSharedState = function (functionStringEscaped, sharedState = {}) {
      return new Function("$sharedState", `return { func: ${functionStringEscaped}, sharedState: $sharedState}`)(sharedState);
    };

    const sharedState = GlobalStateProvider.getInstance().getSharedStateCopy();
    const {func: generatedFunction, sharedState: updatedSharedStateRef} = generateFunctionWithSharedState(functionString, sharedState);
    
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
     * But we are using it here to make the data flow obvious as we read this code.
     */
    GlobalStateProvider.getInstance().setSharedState(updatedSharedStateRef);

    if (typeof finalResponse === "object") {
        finalResponse = JSON.stringify(finalResponse);
      }

    return finalResponse;
}