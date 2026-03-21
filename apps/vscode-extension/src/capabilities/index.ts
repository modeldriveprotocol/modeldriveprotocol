import type { MdpClient } from "@modeldriveprotocol/client";

import { registerReviewCapabilities } from "./review.js";
import { registerCapabilityResources } from "./resources.js";
import type { CapabilityEnvironment } from "./types.js";
import { registerWorkspaceTools } from "./workspace-tools.js";

export type { CapabilityEnvironment } from "./types.js";

export function registerCapabilities(
  client: MdpClient,
  environment: CapabilityEnvironment
): void {
  registerWorkspaceTools(client, environment);
  registerReviewCapabilities(client, environment);
  registerCapabilityResources(client, environment);

  environment.log(
    "Registered VSCode capabilities: getWorkspaceContext, findWorkspaceFiles, readWorkspaceFile, searchWorkspaceText, getDiagnostics, executeCommand, reviewSelection, vscode/review-active-editor, and 3 resources."
  );
}
