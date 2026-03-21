import type { MdpClient } from "@modeldriveprotocol/client";

import type { ChromeExtensionRuntimeApi } from "../runtime-api.js";
import { registerExtensionCapabilities } from "./extension.js";
import { registerPageCapabilities } from "./page.js";
import { registerBackgroundResources } from "./resources.js";

export function registerBackgroundCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi
): void {
  registerExtensionCapabilities(client, runtime);
  registerPageCapabilities(client, runtime);
  registerBackgroundResources(client, runtime);
}
