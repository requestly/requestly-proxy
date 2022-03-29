import { Rule, RuleGroup } from "../../types";

interface IRulesDataSource {
    getRules: (requestHeaders: {}) => Rule[]

    getGroups(requestHeaders: {}): RuleGroup[]
}

export default IRulesDataSource;
