import IInitialGlobalState from '../../interfaces/state';

declare class GlobalState {
    private state: IInitialGlobalState;
    constructor(initialState?: IInitialGlobalState);

    setSharedState(newSharedState: Record<string, any>): void;
    getSharedStateRef(): Record<string, any>;
    getSharedStateCopy(): Record<string, any>;
    setVariables(newVariables: Record<string, any>): void;
    getVariablesRef(): Record<string, any>;
    getVariablesCopy(): Record<string, any>;
}

declare const ProxyGlobal: GlobalState;

export { GlobalState as default, ProxyGlobal };