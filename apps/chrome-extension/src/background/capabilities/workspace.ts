import type { MdpClient } from '@modeldriveprotocol/client'

import type { BackgroundClientConfig } from '#~/shared/config.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { registerScriptedBackgroundExpose } from './scripted-background-exposes.js'

const backgroundClientMutationSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['background', 'route'] },
    id: { type: 'string' },
    clientId: { type: 'string' },
    nextClientId: { type: 'string' },
    clientName: { type: 'string' },
    clientDescription: { type: 'string' },
    icon: { type: 'string' },
    enabled: { type: 'boolean' },
    favorite: { type: 'boolean' },
    matchPatterns: { type: 'array', items: { type: 'string' } },
    autoInjectBridge: { type: 'boolean' },
    pathScriptSource: { type: 'string' },
    exposes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'path', 'description', 'enabled', 'source'],
        properties: {
          id: { type: 'string' },
          path: { type: 'string' },
          description: { type: 'string' },
          enabled: { type: 'boolean' },
          source: { type: 'string' }
        }
      }
    },
    disabledExposePaths: { type: 'array', items: { type: 'string' } },
    disabledTools: { type: 'array', items: { type: 'string' } },
    disabledResources: { type: 'array', items: { type: 'string' } },
    disabledSkills: { type: 'array', items: { type: 'string' } }
  }
} as const

export function registerWorkspaceCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  config: BackgroundClientConfig
): void {
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.clients.list',
    { method: 'GET' }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.clients.create',
    {
      method: 'POST',
      inputSchema: {
        ...backgroundClientMutationSchema,
        required: ['kind']
      }
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.clients.update',
    {
      method: 'PATCH',
      inputSchema: backgroundClientMutationSchema
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.clients.delete',
    {
      method: 'DELETE',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['background', 'route'] },
          id: { type: 'string' },
          clientId: { type: 'string' }
        }
      }
    }
  )
  registerScriptedBackgroundExpose(
    client,
    runtime,
    config,
    'extension.clients.add-expose-rule',
    {
      method: 'POST',
      inputSchema: {
        type: 'object',
        required: ['value'],
        properties: {
          kind: { type: 'string', enum: ['route'] },
          id: { type: 'string' },
          clientId: { type: 'string' },
          mode: {
            type: 'string',
            enum: [
              'pathname-prefix',
              'pathname-exact',
              'url-contains',
              'regex'
            ]
          },
          value: { type: 'string' },
          prepend: { type: 'boolean' }
        }
      }
    }
  )
}
