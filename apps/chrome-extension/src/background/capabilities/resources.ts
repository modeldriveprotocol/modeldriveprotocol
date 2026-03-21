import type { MdpClient } from "@modeldriveprotocol/client";

import type { ChromeExtensionRuntimeApi } from "../runtime-api.js";
import { jsonResource } from "../shared.js";
import { serializeError } from "../../shared/utils.js";

export function registerBackgroundResources(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi
): void {
  client.exposeResource(
    "chrome-extension://status",
    async () => jsonResource(await runtime.getStatus()),
    {
      name: "Chrome Extension Status",
      mimeType: "application/json"
    }
  );

  client.exposeResource(
    "chrome-extension://config",
    async () => jsonResource(await runtime.getConfig()),
    {
      name: "Chrome Extension Config",
      mimeType: "application/json"
    }
  );

  client.exposeResource(
    "chrome-extension://active-tab",
    async () => {
      try {
        return jsonResource(await runtime.runPageCommand(undefined, { type: "getSnapshot" }));
      } catch (error) {
        return jsonResource({
          ok: false,
          error: serializeError(error)
        });
      }
    },
    {
      name: "Active Tab Snapshot",
      mimeType: "application/json"
    }
  );

  client.exposeResource(
    "chrome-extension://active-bridge",
    async () => {
      try {
        return jsonResource(await runtime.getInjectedState(undefined));
      } catch (error) {
        return jsonResource({
          ok: false,
          error: serializeError(error)
        });
      }
    },
    {
      name: "Active Tab Bridge State",
      mimeType: "application/json"
    }
  );

  client.exposeResource(
    "chrome-extension://tabs",
    async () => {
      const tabs = await runtime.listTabs({});
      return jsonResource({
        tabs
      });
    },
    {
      name: "Browser Tabs",
      mimeType: "application/json"
    }
  );
}
