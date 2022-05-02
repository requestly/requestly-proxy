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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_ctx_helper_1 = require("../helpers/proxy_ctx_helper");
const rule_processor_helper_1 = __importDefault(require("../helpers/rule_processor_helper"));
const rule_action_processor_1 = __importDefault(require("../rule_action_processor"));
class RulesMiddleware {
    constructor(is_active, ctx, rulesHelper) {
        this._init_request_data = (ctx) => {
            var _a, _b, _c, _d;
            this.request_data = {
                request_url: (0, proxy_ctx_helper_1.get_request_url)(ctx),
                request_headers: (0, proxy_ctx_helper_1.get_original_request_headers)(ctx),
                query_params: (_b = (_a = ctx.rq) === null || _a === void 0 ? void 0 : _a.original_request) === null || _b === void 0 ? void 0 : _b.query_params,
                method: (_d = (_c = ctx.rq) === null || _c === void 0 ? void 0 : _c.original_request) === null || _d === void 0 ? void 0 : _d.method,
            };
            this.rule_processor_helper.init_request_data(this.request_data);
        };
        this._init_response_data = (ctx) => {
            this.response_data = {
                response_headers: (0, proxy_ctx_helper_1.get_original_response_headers)(ctx),
            };
            this.rule_processor_helper.init_response_data(this.response_data);
        };
        this._update_request_data = (data) => {
            this.request_data = Object.assign(Object.assign({}, this.request_data), data);
            this.rule_processor_helper.init_request_data(this.request_data);
        };
        this._fetch_rules = () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.active_rules = yield this.rulesHelper.get_rules(true, ((_a = this.request_data) === null || _a === void 0 ? void 0 : _a.request_headers) || {});
        });
        /*
          @return: actions[]
        */
        this._process_rules = (is_response = false) => {
            // https://github.com/requestly/requestly-master/issues/686
            // 1 time processing if we fix this issue
            let rule_actions = this.rule_processor_helper.process_rules(this.active_rules, is_response);
            // Filter out all the null actions
            rule_actions = rule_actions.filter((action) => !!action);
            return rule_actions;
        };
        this._update_action_result_objs = (action_result_objs = []) => {
            if (action_result_objs) {
                this.action_result_objs =
                    this.action_result_objs.concat(action_result_objs);
            }
        };
        this.on_request = (ctx) => __awaiter(this, void 0, void 0, function* () {
            if (!this.is_active) {
                return [];
            }
            // TODO: Remove this. Hack to fix rule not fetching first time.
            yield this._fetch_rules();
            this.on_request_actions = this._process_rules();
            const { action_result_objs, continue_request } = yield this.rule_action_processor.process_actions(this.on_request_actions, ctx);
            this._update_action_result_objs(action_result_objs);
            return { action_result_objs, continue_request };
        });
        this.on_response = (ctx) => __awaiter(this, void 0, void 0, function* () {
            if (!this.is_active) {
                return [];
            }
            this._init_response_data(ctx);
            this._update_request_data({ request_body: ctx.rq.get_json_request_body() });
            this.on_response_actions = this._process_rules(true);
            const { action_result_objs, continue_request } = yield this.rule_action_processor.process_actions(this.on_response_actions, ctx);
            this._update_action_result_objs(action_result_objs);
            return { action_result_objs, continue_request };
        });
        this.on_request_end = (ctx) => __awaiter(this, void 0, void 0, function* () {
            if (!this.is_active) {
                return [];
            }
            const { action_result_objs, continue_request } = yield this.rule_action_processor.process_actions(this.on_request_actions, ctx);
            this._update_action_result_objs(action_result_objs);
            return { action_result_objs, continue_request };
        });
        this.on_response_end = (ctx) => __awaiter(this, void 0, void 0, function* () {
            if (!this.is_active) {
                return [];
            }
            const { action_result_objs, continue_request } = yield this.rule_action_processor.process_actions(this.on_response_actions, ctx);
            this._update_action_result_objs(action_result_objs);
            return { action_result_objs, continue_request };
        });
        this.is_active = is_active;
        this.rule_processor_helper = new rule_processor_helper_1.default();
        this.rule_action_processor = new rule_action_processor_1.default();
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
}
exports.default = RulesMiddleware;
