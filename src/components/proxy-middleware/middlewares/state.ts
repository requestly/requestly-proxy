import {cloneDeep} from 'lodash';

interface IState extends Record<string, any> {
    sharedState?: Record<string, any>;
    variables?: Record<string, any>;
}

export class State {
    private state: IState;
    constructor(sharedState: Record<string, any>, envVars: Record<string, any>) {
        this.state = {
            variables: envVars,
            sharedState,
        };
    }

    setSharedState(newSharedState: Record<string, any>) {
        this.state.sharedState = newSharedState;
    }

    getSharedStateRef() {
        return this.state.sharedState;
    }

    getSharedStateCopy() {
        return cloneDeep(this.state.sharedState);
    }

    setVariables(newVariables: Record<string, any>) {
        this.state.variables = newVariables;
    }

    getVariablesRef() {
        return this.state.variables;
    }

    getVariablesCopy() {
        return cloneDeep(this.state.variables);
    }
}

export default class GlobalStateProvider {
    private static instance: State
    static initInstance(sharedState: Record<string, any> = {}, envVars: Record<string, any> = {}) {
        if (!GlobalStateProvider.instance) {
            GlobalStateProvider.instance = new State(sharedState ?? {}, envVars ?? {});
        }

        return GlobalStateProvider.instance;
    }

    static getInstance() {
        if (!GlobalStateProvider.instance) {
          console.error("[GlobalStateProvider]", "Init first");
        }

        return GlobalStateProvider.instance;
    }
}