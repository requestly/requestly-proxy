import { RULE_PROCESSOR } from "@requestly/requestly-core";
import {
  CONSTANTS as GLOBAL_CONSTANTS,
} from "@requestly/requestly-core";

class RuleProcessorHelper {
  constructor(request_data = null, response_data = null) {
    this.request_data = request_data || {};
    this.response_data = response_data || {};
  }

  init_request_data = (request_data) => {
    this.request_data = request_data;
  };

  init_response_data = (response_data) => {
    this.response_data = response_data;
  };

  process_rules = (rules, is_response = false) => {
    const rule_actions = rules.map((rule) => {
      let rule_action = this.process_rule(rule, is_response);
      return rule_action;
    });
    return rule_actions;
  };

  // Dont pass ctx here. Pass only readonly params from middleware
  process_rule = (rule, is_response = false) => {
    const rule_processor = RULE_PROCESSOR.getInstance(rule.ruleType);
    let rule_action;

    switch (rule.ruleType) {
      case GLOBAL_CONSTANTS.RULE_TYPES.REDIRECT:
      case GLOBAL_CONSTANTS.RULE_TYPES.REPLACE:
      case GLOBAL_CONSTANTS.RULE_TYPES.CANCEL:
      case GLOBAL_CONSTANTS.RULE_TYPES.QUERYPARAM:
      case GLOBAL_CONSTANTS.RULE_TYPES.SCRIPT:
      case GLOBAL_CONSTANTS.RULE_TYPES.DELAY:
        rule_action = this.process_url_modification_rule(rule_processor, rule);
        break;

      case GLOBAL_CONSTANTS.RULE_TYPES.REQUEST:
        rule_action = this.process_request_modification_rule(
          rule_processor,
          rule
        );
        break;

      case GLOBAL_CONSTANTS.RULE_TYPES.RESPONSE:
        rule_action = this.process_response_modification_rule(
          rule_processor,
          rule
        );
        break;

      case GLOBAL_CONSTANTS.RULE_TYPES.HEADERS:
        if (is_response) {
          rule_action = this.process_response_headers_modification_rule(
            rule_processor,
            rule
          );
        } else {
          rule_action = this.process_request_headers_modification_rule(
            rule_processor,
            rule
          );
        }
        break;

      case GLOBAL_CONSTANTS.RULE_TYPES.USERAGENT:
        rule_action = this.process_user_agent_modification_rule(
          rule_processor,
          rule
        );
        break;

      default:
        break;
    }

    rule_action = this.add_rule_details_to_action(rule_action, rule);
    return rule_action;
  };

  add_rule_details_to_action = (rule_action, rule) => {
    if (rule_action) {
      rule_action["rule_id"] = rule.id;
      rule_action["rule_type"] = rule.ruleType;
    }

    return rule_action;
  };

  process_url_modification_rule = (rule_processor, rule) => {
    const rule_action = rule_processor.process({
      rule,
      requestURL: this.request_data.request_url,
      details: this.request_data
    });
    return rule_action;
  };

  process_request_modification_rule = (rule_processor, rule) => {
    let requestData = {};

    if (this.request_data.method == "POST") {
      requestData = this.request_data.request_body;
    } else {
      requestData = this.request_data.query_params;
    }

    const rule_action = rule_processor.process({
      rule,
      requestURL: this.request_data.request_url,
      details: { ...this.request_data , requestData },
    });
    return rule_action;
  };

  process_response_modification_rule = (rule_processor, rule) => {
    let requestData = {};

    if (this.request_data.method == "POST") {
      requestData = this.request_data.request_body;
    } else {
      requestData = this.request_data.query_params;
    }

    const rule_action = rule_processor.process({
      rule,
      requestURL: this.request_data.request_url,
      details: { ...this.request_data , requestData },
    });
    return rule_action;
  };

  process_request_headers_modification_rule = (rule_processor, rule) => {
    // {"header1":"val1", "header2":"val2"}
    const originalRequestHeadersObject = this.request_data.request_headers;
    //  ["header1","header2"]
    const originalRequestHeadersObjectKeys = Object.keys(
      originalRequestHeadersObject
    );
    //  [{name:"header1", value:"val1"},{name:"header2", value:"val2"}]
    const originalRequestHeadersObjectKeysValuePairs =
      originalRequestHeadersObjectKeys.map((key) => {
        return {
          name: key,
          value: originalRequestHeadersObject[key],
        };
      });

    const getRequestOrigin = () => {
      if (originalRequestHeadersObject["Origin"])
        return originalRequestHeadersObject["Origin"];
      if (originalRequestHeadersObject["origin"])
        return originalRequestHeadersObject["origin"];
      if (originalRequestHeadersObject["ORIGIN"])
        return originalRequestHeadersObject["ORIGIN"];
      return "*";
    };

    // This would return only Request headers after processing
    const rule_action = rule_processor.process({
      requestURL: this.request_data.request_url,
      rule,
      originalHeaders: originalRequestHeadersObjectKeysValuePairs,
      typeOfHeaders: GLOBAL_CONSTANTS.HEADERS_TARGET.REQUEST,
      payload: {
        requestOrigin: getRequestOrigin(),
      },
      details: this.request_data
    });

    return rule_action;
  };

  process_response_headers_modification_rule = (rule_processor, rule) => {
    // {"header1":"val1", "header2":"val2"}
    const originalResponseHeadersObject = this.response_data.response_headers;
    //  ["header1","header2"]
    const originalResponseHeadersObjectKeys = Object.keys(
      originalResponseHeadersObject
    );
    //  [{name:"header1", value:"val1"},{name:"header2", value:"val2"}]
    const originalResponseHeadersObjectKeysValuePairs =
      originalResponseHeadersObjectKeys.map((key) => {
        return {
          name: key,
          value: originalResponseHeadersObject[key],
        };
      });

    const getRequestOrigin = () => {
      // array [{ name: header_name,value: header_val }] -> {headerName1:"value1",headerName2 :"value2"}
      const originalRequestHeadersConvertedObject =
        this.request_data.request_headers;

      if (originalRequestHeadersConvertedObject["Origin"])
        return originalRequestHeadersConvertedObject["Origin"];
      if (originalRequestHeadersConvertedObject["origin"])
        return originalRequestHeadersConvertedObject["origin"];
      if (originalRequestHeadersConvertedObject["ORIGIN"])
        return originalRequestHeadersConvertedObject["ORIGIN"];
      return "*";
    };

    // This would return only Request headers after processing
    const rule_action = rule_processor.process({
      requestURL: this.request_data.request_url,
      rule,
      originalHeaders: originalResponseHeadersObjectKeysValuePairs,
      typeOfHeaders: GLOBAL_CONSTANTS.HEADERS_TARGET.RESPONSE,
      payload: {
        requestOrigin: getRequestOrigin(),
      },
      details: this.request_data
    });

    return rule_action;
  };

  process_user_agent_modification_rule = (rule_processor, rule) => {
    /** REQUEST HEADERS */

    // {"header1":"val1", "header2":"val2"}
    const originalRequestHeadersObject = this.request_data.request_headers;
    //  ["header1","header2"]
    const originalRequestHeadersObjectKeys = Object.keys(
      originalRequestHeadersObject
    );
    //  [{name:"header1", value:"val1"},{name:"header2", value:"val2"}]
    const originalRequestHeadersObjectKeysValuePairs =
      originalRequestHeadersObjectKeys.map((key) => {
        return {
          name: key,
          value: originalRequestHeadersObject[key],
        };
      });

    const rule_action = rule_processor.process({
      requestURL: this.request_data.request_url,
      rule,
      originalRequestHeaders: originalRequestHeadersObjectKeysValuePairs,
      details: this.request_data
    });

    return rule_action;
  };
}

export default RuleProcessorHelper;
