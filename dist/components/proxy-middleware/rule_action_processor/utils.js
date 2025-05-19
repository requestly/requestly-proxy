"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_file_contents = exports.get_success_actions_from_action_results = exports.build_post_process_data = exports.build_action_processor_response = void 0;
const fs_1 = __importDefault(require("fs"));
const build_action_processor_response = (action, success = false, post_process_data = null) => {
    let resp = {
        action: action,
        success: success,
        post_process_data: post_process_data,
    };
    return resp;
};
exports.build_action_processor_response = build_action_processor_response;
const build_post_process_data = (status_code, headers, body) => {
    if (!status_code && !headers && !body) {
        return null;
    }
    let data = {
        status_code,
        headers,
        body,
    };
    return data;
};
exports.build_post_process_data = build_post_process_data;
const get_success_actions_from_action_results = (action_result_objs = []) => {
    if (!action_result_objs) {
        return [];
    }
    // BY default success is false
    const success_action_results_objs = action_result_objs.filter((obj) => obj && obj && obj.success === true);
    return success_action_results_objs.map((obj) => obj.action);
};
exports.get_success_actions_from_action_results = get_success_actions_from_action_results;
const get_file_contents = (file_path) => {
    return fs_1.default.readFileSync(action.response, "utf-8");
};
exports.get_file_contents = get_file_contents;
