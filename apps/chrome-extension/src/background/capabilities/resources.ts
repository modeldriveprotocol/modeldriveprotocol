import type { MdpClient } from '@modeldriveprotocol/client'

import {
  isBackgroundExposeEnabled,
  type BackgroundClientConfig
} from '#~/shared/config.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { jsonResource } from '#~/background/shared.js'

const STATUS_RESOURCE_PATH = '/extension/resources/status'
const CONFIG_RESOURCE_PATH = '/extension/resources/config'
const TABS_RESOURCE_PATH = '/extension/resources/tabs'

export function registerBackgroundResources(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  config: BackgroundClientConfig
): void {
  exposeBackgroundResource(client, config, STATUS_RESOURCE_PATH, () => {
    client.expose(
      STATUS_RESOURCE_PATH,
      {
        method: 'GET',
        description: 'Read a JSON snapshot of the extension status.',
        contentType: 'application/json'
      },
      async () => jsonResource(await runtime.getStatus()),
    )
  })

  exposeBackgroundResource(client, config, CONFIG_RESOURCE_PATH, () => {
    client.expose(
      CONFIG_RESOURCE_PATH,
      {
        method: 'GET',
        description: 'Read a JSON snapshot of the current extension workspace config.',
        contentType: 'application/json'
      },
      async () => jsonResource(await runtime.getConfig()),
    )
  })

  exposeBackgroundResource(client, config, TABS_RESOURCE_PATH, () => {
    client.expose(
      TABS_RESOURCE_PATH,
      {
        method: 'GET',
        description: 'Read a JSON snapshot of visible browser tabs.',
        contentType: 'application/json'
      },
      async () => {
        const tabs = await runtime.listTabs({})
        return jsonResource({
          tabs
        })
      }
    )
  })
}

function exposeBackgroundResource(
  client: MdpClient,
  config: BackgroundClientConfig,
  path: string,
  register: () => void
): void {
  if (!isBackgroundExposeEnabled(config, path)) {
    return
  }

  register()
}
