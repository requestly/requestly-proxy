import IRulesDataSource from "../../components/interfaces/rules-data-source";
declare class RulesHelper {
    rulesDataSource: IRulesDataSource;
    constructor(rulesDataSource: IRulesDataSource);
    is_group_active: (group: any) => boolean;
    is_rule_active: (rule: any, active_group_ids?: any[]) => boolean;
    get_groups: (is_active?: boolean, requestHeaders?: {}) => Promise<import("../../types").RuleGroup[]>;
    get_group_ids: (is_active?: boolean, requestHeaders?: {}) => Promise<String[]>;
    get_rules: (is_active?: boolean, requestHeaders?: {}) => Promise<import("../../types").Rule[]>;
}
export default RulesHelper;
