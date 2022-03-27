import { Rule, RuleGroup } from "../../types";
interface IRulesDataSource {
    getRules: (requestHeaders: {}) => Promise<Rule[]>;
    getGroups(requestHeaders: {}): Promise<RuleGroup[]>;
}
export default IRulesDataSource;
