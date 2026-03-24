import type { MdpClient } from '@modeldriveprotocol/client'

import {
  isBackgroundCapabilityEnabled,
  type BackgroundClientConfig
} from '#~/shared/config.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { jsonResource } from '#~/background/shared.js'

export function registerBackgroundResources(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  config: BackgroundClientConfig
): void {
  exposeBackgroundResource(client, config, 'chrome-extension://status', () => {
    client.exposeResource(
      'chrome-extension://status',
      async () => jsonResource(await runtime.getStatus()),
      {
        name: 'Chrome Extension Status',
        mimeType: 'application/json'
      }
    )
  })

  exposeBackgroundResource(client, config, 'chrome-extension://config', () => {
    client.exposeResource(
      'chrome-extension://config',
      async () => jsonResource(await runtime.getConfig()),
      {
        name: 'Chrome Extension Workspace Config',
        mimeType: 'application/json'
      }
    )
  })

  exposeBackgroundResource(client, config, 'chrome-extension://tabs', () => {
    client.exposeResource(
      'chrome-extension://tabs',
      async () => {
        const tabs = await runtime.listTabs({})
        return jsonResource({
          tabs
        })
      },
      {
        name: 'Browser Tabs',
        mimeType: 'application/json'
      }
    )
  })
}

function exposeBackgroundResource(
  client: MdpClient,
  config: BackgroundClientConfig,
  uri: string,
  register: () => void
): void {
  if (!isBackgroundCapabilityEnabled(config, 'resource', uri)) {
    return
  }

  register()
}
