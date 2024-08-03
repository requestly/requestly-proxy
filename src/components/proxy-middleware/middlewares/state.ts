import {cloneDeep} from 'lodash';
import IInitialState from '../../interfaces/state';

export default class State {
    protected state: IInitialState;
    constructor(initialState?: IInitialState) {
        this.state = {
            variables: {},
            sharedState: {},
            ...initialState
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