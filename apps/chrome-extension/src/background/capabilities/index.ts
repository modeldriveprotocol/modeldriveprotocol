import type { MdpClient } from '@modeldriveprotocol/client/browser'

import type { BackgroundClientConfig } from '#~/shared/config.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { registerExtensionCapabilities } from './extension.js'
import { registerBackgroundResources } from './resources.js'
import { registerBackgroundSkills } from './skills.js'
import { registerWorkspaceCapabilities } from './workspace.js'

export function registerBackgroundCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  config: BackgroundClientConfig
): void {
  registerExtensionCapabilities(client, runtime, config)
  registerWorkspaceCapabilities(client, runtime, config)
  registerBackgroundResources(client, runtime, config)
  registerBackgroundSkills(client, config)
}
