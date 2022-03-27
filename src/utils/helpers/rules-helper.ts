import IRulesDataSource from "../../components/interfaces/rules-data-source";

class RulesHelper {
  rulesDataSource: IRulesDataSource;

  // TODO: this can be static class too
  constructor(rulesDataSource: IRulesDataSource) {
    this.rulesDataSource = rulesDataSource;
  }

  is_group_active = (group) => {
    if (!group) {
      return false;
    }

    return group.status == "Active";
  };

  is_rule_active = (rule, active_group_ids = []) => {
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

  get_groups = async (is_active = false, requestHeaders = {}) => {
    let groups = await this.rulesDataSource.getGroups(requestHeaders) || [];

    if (is_active === true) {
      groups = groups.filter((group) => this.is_group_active(group));
    }

    return groups;
  };

  get_group_ids = async (is_active = false, requestHeaders = {}) => {
    const groups = await this.get_groups(is_active, requestHeaders);
    return groups.map((group) => group.id);
  };

  get_rules = async (is_active = false, requestHeaders = {}) => {
    let rules = await this.rulesDataSource.getRules(requestHeaders) || [];
    let active_group_ids = await this.get_group_ids(true, requestHeaders) || [];

    if (is_active === true) {
      rules = rules.filter((rule) => this.is_rule_active(rule, active_group_ids));
    }

    // Sorting Rules By id asc
    rules = rules.sort((rule1, rule2) => {
      return ("" + rule1.id).localeCompare(rule2.id);
    });

    return rules;
  };
}

export default RulesHelper;
