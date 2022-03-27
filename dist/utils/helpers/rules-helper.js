"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class RulesHelper {
    // TODO: this can be static class too
    constructor(rulesDataSource) {
        this.is_group_active = (group) => {
            if (!group) {
                return false;
            }
            return group.status == "Active";
        };
        this.is_rule_active = (rule, active_group_ids = []) => {
            if (!rule) {
                return false;
            }
            let status = false;
            status = rule.status == "Active";
            // No group case || active group case
            if (rule.groupId == "" || active_group_ids.includes(rule.groupId)) {
                return status;
            }
            return false;
        };
        this.get_groups = (is_active = false, requestHeaders = {}) => __awaiter(this, void 0, void 0, function* () {
            let groups = (yield this.rulesDataSource.getGroups(requestHeaders)) || [];
            if (is_active === true) {
                groups = groups.filter((group) => this.is_group_active(group));
            }
            return groups;
        });
        this.get_group_ids = (is_active = false, requestHeaders = {}) => __awaiter(this, void 0, void 0, function* () {
            const groups = yield this.get_groups(is_active, requestHeaders);
            return groups.map((group) => group.id);
        });
        this.get_rules = (is_active = false, requestHeaders = {}) => __awaiter(this, void 0, void 0, function* () {
            let rules = (yield this.rulesDataSource.getRules(requestHeaders)) || [];
            let active_group_ids = (yield this.get_group_ids(true, requestHeaders)) || [];
            if (is_active === true) {
                rules = rules.filter((rule) => this.is_rule_active(rule, active_group_ids));
            }
            // Sorting Rules By id asc
            rules = rules.sort((rule1, rule2) => {
                return ("" + rule1.id).localeCompare(rule2.id);
            });
            return rules;
        });
        this.rulesDataSource = rulesDataSource;
    }
}
exports.default = RulesHelper;
