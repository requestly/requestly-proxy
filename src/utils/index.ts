import { types } from "util";
import ConsoleCapture from "capture-console-logs";
import GlobalStateProvider from "../components/proxy-middleware/middlewares/state";

// Only used for verification now. For execution, we regenerate the function in executeUserFunction with the sharedState
export const getFunctionFromString = function (functionStringEscaped) {
    return new Function(`return ${functionStringEscaped}`)();
};


/* Expects that the functionString has already been validated to be representing a proper function */
export async function executeUserFunction(ctx, functionString: string, args) {

    const generateFunctionWithSharedState = function (functionStringEscaped) {

		const SHARED_STATE_VAR_NAME = "$sharedState";
		
		const sharedState = GlobalStateProvider.getInstance().getSharedStateCopy();
    	
		return new Function(`${SHARED_STATE_VAR_NAME}`, `return { func: ${functionStringEscaped}, updatedSharedState: ${SHARED_STATE_VAR_NAME}}`)(sharedState);
    };

    const {func: generatedFunction, updatedSharedState} = generateFunctionWithSharedState(functionString);
    
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
    GlobalStateProvider.getInstance().setSharedState(updatedSharedState);

    if (typeof finalResponse === "object") {
        finalResponse = JSON.stringify(finalResponse);
      }

    return finalResponse;
}