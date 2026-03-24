import type { MdpClient } from '@modeldriveprotocol/client'

import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { jsonResource } from '#~/background/shared.js'

export function registerBackgroundResources(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi
): void {
  client.exposeResource(
    'chrome-extension://status',
    async () => jsonResource(await runtime.getStatus()),
    {
      name: 'Chrome Extension Status',
      mimeType: 'application/json'
    }
  )

  client.exposeResource(
    'chrome-extension://config',
    async () => jsonResource(await runtime.getConfig()),
    {
      name: 'Chrome Extension Workspace Config',
      mimeType: 'application/json'
    }
  )

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
}
