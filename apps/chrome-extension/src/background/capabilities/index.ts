import type { MdpClient } from '@modeldriveprotocol/client'

import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { registerExtensionCapabilities } from './extension.js'
import { registerBackgroundResources } from './resources.js'

export function registerBackgroundCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi
): void {
  registerExtensionCapabilities(client, runtime)
  registerBackgroundResources(client, runtime)
}
