import { Rule, RuleGroup } from "../../types";

interface IRulesDataSource {
    getRules: () => Rule[]

    getGroups(): RuleGroup[]
}

export default IRulesDataSource;
