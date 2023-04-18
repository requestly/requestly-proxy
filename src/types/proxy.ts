import { Entry as HAREntry } from "har-format";

export enum NetworkResourceType {
    FETCH = "fetch",
    XHR = "xhr",
    JS = "script",
    CSS = "stylesheet",
    IMG = "image",
    MEDIA = "media",
    FONT = "font",
    DOC = "document",
    WEBSOCKET = "websocket",
    WASM = "wasm",
    MANIFEST = "manifest",
    OTHER = "other",
}

export enum DesktopNetworkLogEventType {
    REQUEST = "REQUEST",
    REQUEST_END = "REQUEST_END",
    RESPONSE = "RESPONSE",
    RESPONSE_END = "RESPONSE_END",
}

export type NetworkLog = HAREntry & { _resourceType?: NetworkResourceType };

export interface RQRuleAction extends Record<string, unknown> {
    ruleId: string;
    ruleType?: string;
    // TODO: Add this later when we add diff
    // metadata?: {
    //   diff: unknown;
    // };
    // Contains other stuff like redirectUrl, headers etc too.
}

export interface DesktopNetworkLog extends Record<string, unknown> {
  id: string;
  data: NetworkLog;
  actions?: RQRuleAction[];
}

export interface DesktopNetworkLogEvent {
  type: DesktopNetworkLogEventType;
  data: DesktopNetworkLog;
}

export interface Ctx {

}