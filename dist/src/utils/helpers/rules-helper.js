"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RulesHelper {
    // TODO: this can be static class too
    constructor(rulesDataSource) {
        this.is_group_active = (group, requestHeaders = {}) => {
            if (!group) {
                return false;
            }
            return group.status == "Active";
        };
        this.is_rule_active = (rule, requestHeaders = {}) => {
            if (!rule) {
                return false;
            }
            let status = false;
            status = rule.status == "Active";
            const active_group_ids = this.get_group_ids(true, requestHeaders) || [];
            // No group case || active group case
            if (rule.groupId == "" || active_group_ids.includes(rule.groupId)) {
                return status;
            }
            return false;
        };
        this.get_groups = (is_active = false, requestHeaders = {}) => {
            let groups = this.rulesDataSource.getGroups(requestHeaders) || [];
            if (is_active === true) {
                groups = groups.filter((group) => this.is_group_active(group));
            }
            return groups;
        };
        this.get_group_ids = (is_active = false, requestHeaders = {}) => {
            const groups = this.get_groups(is_active, requestHeaders);
            return groups.map((group) => group.id);
        };
        this.get_rules = (is_active = false, requestHeaders = {}) => {
            let rules = this.rulesDataSource.getRules(requestHeaders) || [];
            if (is_active === true) {
                rules = rules.filter((rule) => this.is_rule_active(rule, requestHeaders));
            }
            // Sorting Rules By id asc
            rules = rules.sort((rule1, rule2) => {
                return ("" + rule1.id).localeCompare(rule2.id);
            });
            return rules;
        };
        this.rulesDataSource = rulesDataSource;
    }
}
exports.default = RulesHelper;
