import type { ExtensionConfig } from "../shared/config.js";
import type {
  InjectedToolDescriptor,
  MainWorldBridgeState,
  PageCommand
} from "../page/messages.js";
import type { BrowserTabSummary, PopupState } from "./shared.js";

export interface ConnectionConfigPatch {
  serverUrl?: string;
  clientId?: string;
  clientName?: string;
  clientDescription?: string;
  autoConnect?: boolean;
  autoInjectBridge?: boolean;
}

export interface ChromeExtensionRuntimeApi {
  getStatus(): Promise<PopupState>;
  getConfig(): Promise<ExtensionConfig>;
  updateConnectionConfig(patch: ConnectionConfigPatch): Promise<PopupState>;
  setDefaultToolScript(toolScriptSource: string): Promise<{
    updated: true;
    toolScriptSourceLength: number;
  }>;
  listGrantedOrigins(): Promise<unknown>;
  listTabs(options: { windowId?: number; activeOnly?: boolean }): Promise<BrowserTabSummary[]>;
  activateTab(tabId: number): Promise<BrowserTabSummary>;
  reloadTab(args: unknown): Promise<{
    reloaded: true;
    tab: BrowserTabSummary;
  }>;
  createTab(options: { url: string; active?: boolean }): Promise<BrowserTabSummary>;
  closeTab(args: unknown): Promise<{
    closed: true;
    tabId: number;
  }>;
  showNotification(options: {
    title?: string;
    message: string;
  }): Promise<{
    shown: true;
    notificationId: string;
  }>;
  openOptionsPage(): Promise<{
    opened: true;
  }>;
  runPageCommand<TResult>(args: unknown, command: PageCommand): Promise<TResult>;
  injectToolScript(input: {
    tabId?: number;
    source: string;
    scriptArgs?: unknown;
    scriptId?: string;
    force?: boolean;
  }): Promise<InjectedToolDescriptor[]>;
  getInjectedState(args: unknown): Promise<MainWorldBridgeState>;
  listInjectedToolsForArgs(args: unknown): Promise<InjectedToolDescriptor[]>;
  callInjectedTool(input: {
    tabId?: number;
    name: string;
    toolArgs?: unknown;
  }): Promise<unknown>;
}
