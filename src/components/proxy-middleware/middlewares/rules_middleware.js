import {
  get_request_url,
  get_original_request_headers,
  get_original_response_headers,
} from "../helpers/proxy_ctx_helper";
import RuleProcessorHelper from "../helpers/rule_processor_helper";
import RuleActionProcessor from "../rule_action_processor";

class RulesMiddleware {
  constructor(is_active, ctx, rulesHelper) {
    this.is_active = is_active;

    this.rule_processor_helper = new RuleProcessorHelper();
    this.rule_action_processor = new RuleActionProcessor();

    this.rulesHelper = rulesHelper;

    this._init_request_data(ctx);
    this.active_rules = [];
    this._fetch_rules();

    // Keeping these 2 separate because of request and response headers
    // from rule processor are triggers during different proxy hooks.
    // These can be combined into 1 if we change the actions returned
    // by modify headers rule processor
    // TODO: @sahil865gupta UPGRADE MODIFY HEADER ACTIONS
    // https://github.com/requestly/requestly-master/issues/686
    this.on_request_actions = [];
    this.on_response_actions = [];

    this.action_result_objs = [];
  }
  getActionsForEvent() {
    if(!this.action_result_objs) return []

    return this.action_result_objs.map(actionObj => {
      return {
        ruleId: actionObj?.action?.rule_id,
        ruleType: actionObj?.action?.rule_type,
      }
    })
  }

  _init_request_data = (ctx) => {
    this.request_data = {
      request_url: get_request_url(ctx),
      request_headers: get_original_request_headers(ctx),
      query_params: ctx.rq?.original_request?.query_params,
      method: ctx.rq?.original_request?.method,
    };
    this.rule_processor_helper.init_request_data(this.request_data);
  };

  _init_response_data = (ctx) => {
    this.response_data = {
      response_headers: get_original_response_headers(ctx),
    };
    this.rule_processor_helper.init_response_data(this.response_data);
  };
  _update_request_data = (data) => {
    this.request_data = {
      ...this.request_data,
      ...data,
    };
    this.rule_processor_helper.init_request_data(this.request_data);
  };

  _fetch_rules = async () => {
    this.active_rules = await this.rulesHelper.get_rules(
      true,
      this.request_data?.request_headers || {}
    );
  };

  /*
    @return: actions[]
  */
  _process_rules = (is_response = false) => {
    // https://github.com/requestly/requestly-master/issues/686
    // 1 time processing if we fix this issue
    let rule_actions = this.rule_processor_helper.process_rules(
      this.active_rules,
      is_response
    );

    // Filter out all the null actions
    rule_actions = rule_actions.filter((action) => !!action);

    return rule_actions;
  };

  _update_action_result_objs = (action_result_objs = []) => {
    if (action_result_objs) {
      this.action_result_objs =
        this.action_result_objs.concat(action_result_objs);
    }
  };

  on_request = async (ctx) => {
    if (!this.is_active) {
      return [];
    }

    // TODO: Remove this. Hack to fix rule not fetching first time.
    await this._fetch_rules();

    this.on_request_actions = this._process_rules();

    const { action_result_objs, continue_request } =
      await this.rule_action_processor.process_actions(
        this.on_request_actions,
        ctx
      );
    this._update_action_result_objs(action_result_objs);
    return { action_result_objs, continue_request };
  };

  on_response = async (ctx) => {
    if (!this.is_active) {
      return [];
    }

    this._init_response_data(ctx);
    this.on_response_actions = this._process_rules(true);

    const { action_result_objs, continue_request } =
      await this.rule_action_processor.process_actions(
        this.on_response_actions,
        ctx
      );

    this._update_action_result_objs(action_result_objs);
    return { action_result_objs, continue_request };
  };

  on_request_end = async (ctx) => {
    if (!this.is_active) {
      return [];
    }
    this._update_request_data({ request_body: ctx.rq.get_json_request_body() });

    const { action_result_objs, continue_request } =
      await this.rule_action_processor.process_actions(
        this.on_request_actions,
        ctx
      );

    this._update_action_result_objs(action_result_objs);
    return { action_result_objs, continue_request };
  };

  on_response_end = async (ctx) => {
    if (!this.is_active) {
      return [];
    }

    const { action_result_objs, continue_request } =
      await this.rule_action_processor.process_actions(
        this.on_response_actions,
        ctx
      );

    this._update_action_result_objs(action_result_objs);
    return { action_result_objs, continue_request };
  };
}

export default RulesMiddleware;
