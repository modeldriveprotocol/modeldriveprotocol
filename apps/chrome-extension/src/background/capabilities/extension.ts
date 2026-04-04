import type { MdpClient } from '@modeldriveprotocol/client'

import type { BackgroundClientConfig } from '#~/shared/config.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { tabTargetSchema } from '#~/background/shared.js'
import { registerScriptedBackgroundExpose } from './scripted-background-exposes.js'

export function registerExtensionCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  config: BackgroundClientConfig
): void {
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.status',
    { method: 'GET' }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.config',
    { method: 'GET' }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.granted-origins',
    { method: 'GET' }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.tabs',
    { method: 'GET' }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.activate-tab',
    {
      method: 'POST',
      inputSchema: {
        type: 'object',
        required: ['tabId'],
        properties: {
          tabId: { type: 'number' }
        }
      }
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.reload-tab',
    {
      method: 'POST',
      inputSchema: tabTargetSchema()
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.create-tab',
    {
      method: 'POST',
      inputSchema: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string' },
          active: { type: 'boolean' }
        }
      }
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.close-tab',
    {
      method: 'POST',
      inputSchema: tabTargetSchema()
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.show-notification',
    {
      method: 'POST',
      inputSchema: {
        type: 'object',
        required: ['message'],
        properties: {
          title: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.open-options-page',
    { method: 'POST' }
  )
}
