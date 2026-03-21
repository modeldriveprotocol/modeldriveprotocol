import {
  MAIN_WORLD_READY_EVENT,
  MAIN_WORLD_REQUEST_EVENT,
  MAIN_WORLD_RESPONSE_EVENT,
  type InjectedToolDescriptor,
  type MainWorldBridgeState,
  type MainWorldRequest,
  type MainWorldResponse
} from "./messages.js";
import {
  normalizeForMessaging,
  serializeError,
  type SerializedError
} from "../shared/utils.js";

interface RegisteredTool {
  description?: string;
  handler: (args: unknown) => unknown | Promise<unknown>;
}

interface ExtensionBridgeApi {
  registerTool(
    name: string,
    handler: (args: unknown) => unknown | Promise<unknown>,
    options?: {
      description?: string;
    }
  ): void;
  unregisterTool(name: string): void;
  listTools(): InjectedToolDescriptor[];
  getState(): MainWorldBridgeState;
  invokeTool(name: string, args?: unknown): Promise<unknown>;
}

declare global {
  interface Window {
    __MDP_EXTENSION_BRIDGE__?: ExtensionBridgeApi;
    __MDP_EXTENSION_BRIDGE_INSTALLED__?: boolean;
    __MDP_EXTENSION_EXECUTED_SCRIPT_IDS__?: Record<string, true>;
  }
}

if (!window.__MDP_EXTENSION_BRIDGE_INSTALLED__) {
  const registeredTools = new Map<string, RegisteredTool>();
  const executedScriptIds = (window.__MDP_EXTENSION_EXECUTED_SCRIPT_IDS__ ??= {});

  window.__MDP_EXTENSION_BRIDGE_INSTALLED__ = true;
  window.__MDP_EXTENSION_BRIDGE__ = {
    registerTool(name, handler, options) {
      if (!name.trim()) {
        throw new Error("Tool name must not be empty");
      }

      registeredTools.set(name, {
        handler,
        ...(options?.description ? { description: options.description } : {})
      });
    },

    unregisterTool(name) {
      registeredTools.delete(name);
    },

    listTools() {
      return listRegisteredTools(registeredTools);
    },

    getState() {
      return buildBridgeState(registeredTools);
    },

    async invokeTool(name, args) {
      const tool = registeredTools.get(name);

      if (!tool) {
        throw new Error(`Unknown injected tool "${name}"`);
      }

      return tool.handler(args);
    }
  };

  window.addEventListener(MAIN_WORLD_REQUEST_EVENT, (event) => {
    const detail = (event as CustomEvent<MainWorldRequest>).detail;

    if (!detail) {
      return;
    }

    void handleMainWorldRequest(detail, registeredTools);
  });

  window.dispatchEvent(new CustomEvent(MAIN_WORLD_READY_EVENT));
}

async function handleMainWorldRequest(
  request: MainWorldRequest,
  registeredTools: Map<string, RegisteredTool>
): Promise<void> {
  try {
    let data: unknown;

    switch (request.action) {
      case "listTools":
        data = listRegisteredTools(registeredTools);
        break;
      case "getState":
        data = buildBridgeState(registeredTools);
        break;
      case "invokeTool":
        data = await invokeRegisteredTool(request.args, registeredTools);
        break;
      case "runScript":
        data = await runInjectedScript(request.args);
        break;
      default:
        throw new Error(`Unsupported main world action: ${String(request.action)}`);
    }

    dispatchResponse({
      requestId: request.requestId,
      ok: true,
      data: normalizeForMessaging(data)
    });
  } catch (error) {
    dispatchResponse({
      requestId: request.requestId,
      ok: false,
      error: serializeError(error)
    });
  }
}

async function invokeRegisteredTool(
  args: unknown,
  registeredTools: Map<string, RegisteredTool>
): Promise<unknown> {
  if (!isPlainObject(args)) {
    throw new Error("Injected tool invocation args must be an object");
  }

  const name = typeof args.name === "string" ? args.name : "";

  if (!name) {
    throw new Error("Injected tool name is required");
  }

  const tool = registeredTools.get(name);

  if (!tool) {
    throw new Error(`Unknown injected tool "${name}"`);
  }

  return tool.handler(args.toolArgs);
}

async function runInjectedScript(args: unknown): Promise<unknown> {
  if (!isPlainObject(args)) {
    throw new Error("Injected script args must be an object");
  }

  const source = typeof args.source === "string" ? args.source : "";
  const scriptId = typeof args.scriptId === "string" ? args.scriptId : undefined;
  const force = args.force === true;

  if (!source.trim()) {
    throw new Error("Injected script source is required");
  }

  const executedScriptIds = (window.__MDP_EXTENSION_EXECUTED_SCRIPT_IDS__ ??= {});

  if (scriptId && !force && executedScriptIds[scriptId]) {
    return {
      skipped: true,
      scriptId
    };
  }

  const runner = new Function(
    "args",
    `
      return (async () => {
        ${source}
      })();
    `
  ) as (args: unknown) => Promise<unknown>;

  const result = await runner(args.scriptArgs);

  if (scriptId) {
    executedScriptIds[scriptId] = true;
  }

  return result;
}

function listRegisteredTools(
  registeredTools: Map<string, RegisteredTool>
): InjectedToolDescriptor[] {
  return [...registeredTools.entries()].map(([name, tool]) => ({
    name,
    ...(tool.description ? { description: tool.description } : {})
  }));
}

function buildBridgeState(
  registeredTools: Map<string, RegisteredTool>
): MainWorldBridgeState {
  return {
    bridgeInstalled: true,
    tools: listRegisteredTools(registeredTools),
    executedScriptIds: Object.keys(window.__MDP_EXTENSION_EXECUTED_SCRIPT_IDS__ ?? {}).sort()
  };
}

function dispatchResponse(response: {
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: SerializedError;
}): void {
  const detail: MainWorldResponse = {
    requestId: response.requestId,
    ok: response.ok,
    ...(response.data !== undefined ? { data: response.data } : {}),
    ...(response.error ? { error: response.error } : {})
  };

  window.dispatchEvent(
    new CustomEvent(MAIN_WORLD_RESPONSE_EVENT, {
      detail
    })
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
