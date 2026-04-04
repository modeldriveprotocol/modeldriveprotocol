import type { MdpClient } from '@modeldriveprotocol/client'

import type { BackgroundClientConfig } from '#~/shared/config.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { registerScriptedBackgroundExpose } from './scripted-background-exposes.js'

export function registerBackgroundResources(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  config: BackgroundClientConfig
): void {
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.resources.status',
    {
      method: 'GET',
      contentType: 'application/json'
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.resources.config',
    {
      method: 'GET',
      contentType: 'application/json'
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.resources.tabs',
    {
      method: 'GET',
      contentType: 'application/json'
    }
  )
}
