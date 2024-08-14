export declare class State {
    private state;
    constructor(sharedState: Record<string, any>, envVars: Record<string, any>);
    setSharedState(newSharedState: Record<string, any>): void;
    getSharedStateRef(): Record<string, any>;
    getSharedStateCopy(): any;
    setVariables(newVariables: Record<string, any>): void;
    getVariablesRef(): Record<string, any>;
    getVariablesCopy(): any;
}
export default class GlobalStateProvider {
    private static instance;
    static initInstance(sharedState?: Record<string, any>, envVars?: Record<string, any>): State;
    static getInstance(): State;
}
