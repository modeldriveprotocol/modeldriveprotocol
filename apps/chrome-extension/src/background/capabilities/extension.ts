import type { MdpClient } from "@modeldriveprotocol/client";

import type { ChromeExtensionRuntimeApi } from "../runtime-api.js";
import { requireNumberArg, requireStringArg, tabTargetSchema } from "../shared.js";
import { asRecord, readBoolean, readNumber, readString } from "../../shared/utils.js";

export function registerExtensionCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi
): void {
  client.exposeTool(
    "extension.getStatus",
    async () => runtime.getStatus(),
    {
      description: "Read extension connection status, granted origins, and active tab summary."
    }
  );

  client.exposeTool(
    "extension.getConfig",
    async () => runtime.getConfig(),
    {
      description: "Read the current Chrome extension configuration."
    }
  );

  client.exposeTool(
    "extension.setConnectionConfig",
    async (args) => {
      const record = asRecord(args);
      const serverUrl = readString(record, "serverUrl");
      const clientId = readString(record, "clientId");
      const clientName = readString(record, "clientName");
      const clientDescription = readString(record, "clientDescription");
      const autoConnect = readBoolean(record, "autoConnect");
      const autoInjectBridge = readBoolean(record, "autoInjectBridge");

      return runtime.updateConnectionConfig({
        ...(serverUrl ? { serverUrl } : {}),
        ...(clientId ? { clientId } : {}),
        ...(clientName ? { clientName } : {}),
        ...(clientDescription ? { clientDescription } : {}),
        ...(autoConnect !== undefined ? { autoConnect } : {}),
        ...(autoInjectBridge !== undefined ? { autoInjectBridge } : {})
      });
    },
    {
      description:
        "Update connection-related extension settings. Host match patterns still need to be granted from the options page.",
      inputSchema: {
        type: "object",
        properties: {
          serverUrl: { type: "string" },
          clientId: { type: "string" },
          clientName: { type: "string" },
          clientDescription: { type: "string" },
          autoConnect: { type: "boolean" },
          autoInjectBridge: { type: "boolean" }
        }
      }
    }
  );

  client.exposeTool(
    "extension.setDefaultToolScript",
    async (args) => {
      const toolScriptSource = readString(asRecord(args), "toolScriptSource");

      if (toolScriptSource === undefined) {
        throw new Error("toolScriptSource is required");
      }

      return runtime.setDefaultToolScript(toolScriptSource);
    },
    {
      description:
        "Persist the default main-world tool script that will be injected on matched pages.",
      inputSchema: {
        type: "object",
        required: ["toolScriptSource"],
        properties: {
          toolScriptSource: { type: "string" }
        }
      }
    }
  );

  client.exposeTool(
    "extension.listGrantedOrigins",
    async () => runtime.listGrantedOrigins(),
    {
      description: "List the currently granted extension permissions and host origins."
    }
  );

  client.exposeTool(
    "extension.listTabs",
    async (args) => {
      const record = asRecord(args);
      const windowId = readNumber(record, "windowId");
      const activeOnly = readBoolean(record, "activeOnly");

      return runtime.listTabs({
        ...(windowId !== undefined ? { windowId } : {}),
        ...(activeOnly !== undefined ? { activeOnly } : {})
      });
    },
    {
      description: "List browser tabs that the extension can see."
    }
  );

  client.exposeTool(
    "extension.activateTab",
    async (args) => runtime.activateTab(requireNumberArg(args, "tabId")),
    {
      description: "Activate a browser tab by id.",
      inputSchema: {
        type: "object",
        required: ["tabId"],
        properties: {
          tabId: { type: "number" }
        }
      }
    }
  );

  client.exposeTool(
    "extension.reloadTab",
    async (args) => runtime.reloadTab(args),
    {
      description: "Reload a tab. Defaults to the current active tab.",
      inputSchema: tabTargetSchema()
    }
  );

  client.exposeTool(
    "extension.createTab",
    async (args) => {
      const record = asRecord(args);
      const active = readBoolean(record, "active");

      return runtime.createTab({
        url: requireStringArg(args, "url"),
        ...(active !== undefined ? { active } : {})
      });
    },
    {
      description: "Create a new browser tab.",
      inputSchema: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string" },
          active: { type: "boolean" }
        }
      }
    }
  );

  client.exposeTool(
    "extension.closeTab",
    async (args) => runtime.closeTab(args),
    {
      description: "Close a browser tab. Defaults to the current active tab.",
      inputSchema: tabTargetSchema()
    }
  );

  client.exposeTool(
    "extension.showNotification",
    async (args) => {
      const record = asRecord(args);
      const message = readString(record, "message");
      const title = readString(record, "title");

      if (!message) {
        throw new Error("message is required");
      }

      return runtime.showNotification({
        message,
        ...(title ? { title } : {})
      });
    },
    {
      description: "Show a native Chrome notification from the extension.",
      inputSchema: {
        type: "object",
        required: ["message"],
        properties: {
          title: { type: "string" },
          message: { type: "string" }
        }
      }
    }
  );

  client.exposeTool(
    "extension.openOptionsPage",
    async () => runtime.openOptionsPage(),
    {
      description: "Open the extension options page."
    }
  );
}
