import IRulesDataSource from "../../components/interfaces/rules-data-source";
declare class RulesHelper {
    rulesDataSource: IRulesDataSource;
    constructor(rulesDataSource: IRulesDataSource);
    is_group_active: (group: any, requestHeaders?: {}) => boolean;
    is_rule_active: (rule: any, requestHeaders?: {}) => boolean;
    get_groups: (is_active?: boolean, requestHeaders?: {}) => import("../../types").RuleGroup[];
    get_group_ids: (is_active?: boolean, requestHeaders?: {}) => String[];
    get_rules: (is_active?: boolean, requestHeaders?: {}) => import("../../types").Rule[];
}
export default RulesHelper;
