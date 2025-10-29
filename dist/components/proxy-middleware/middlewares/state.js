"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.State = void 0;
const lodash_1 = require("lodash");
class State {
    constructor(sharedState, envVars) {
        this.state = {
            variables: envVars,
            sharedState,
        };
    }
    setSharedState(newSharedState) {
        this.state.sharedState = newSharedState;
    }
    getSharedStateRef() {
        return this.state.sharedState;
    }
    getSharedStateCopy() {
        return (0, lodash_1.cloneDeep)(this.state.sharedState);
    }
    setVariables(newVariables) {
        this.state.variables = newVariables;
    }
    getVariablesRef() {
        return this.state.variables;
    }
    getVariablesCopy() {
        return (0, lodash_1.cloneDeep)(this.state.variables);
    }
}
exports.State = State;
class GlobalStateProvider {
    static initInstance(sharedState = {}, envVars = {}) {
        if (!GlobalStateProvider.instance) {
            GlobalStateProvider.instance = new State(sharedState !== null && sharedState !== void 0 ? sharedState : {}, envVars !== null && envVars !== void 0 ? envVars : {});
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
exports.default = GlobalStateProvider;
