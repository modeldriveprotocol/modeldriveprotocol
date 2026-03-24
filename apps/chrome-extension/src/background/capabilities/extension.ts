import type { MdpClient } from '@modeldriveprotocol/client'

import {
  isBackgroundCapabilityEnabled,
  type BackgroundClientConfig
} from '#~/shared/config.js'
import { asRecord, readBoolean, readNumber, readString } from '#~/shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { requireNumberArg, requireStringArg, tabTargetSchema } from '#~/background/shared.js'

export function registerExtensionCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  config: BackgroundClientConfig
): void {
  exposeBackgroundTool(client, config, 'extension.getStatus', () => {
    client.exposeTool(
      'extension.getStatus',
      async () => runtime.getStatus(),
      {
        description: 'Read the extension workspace status, multi-client connection state, and active tab summary.'
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.getConfig', () => {
    client.exposeTool(
      'extension.getConfig',
      async () => runtime.getConfig(),
      {
        description: 'Read the current Chrome extension workspace configuration.'
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.listGrantedOrigins', () => {
    client.exposeTool(
      'extension.listGrantedOrigins',
      async () => runtime.listGrantedOrigins(),
      {
        description: 'List the currently granted extension permissions and host origins.'
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.listTabs', () => {
    client.exposeTool(
      'extension.listTabs',
      async (args) => {
        const record = asRecord(args)
        const windowId = readNumber(record, 'windowId')
        const activeOnly = readBoolean(record, 'activeOnly')

        return runtime.listTabs({
          ...(windowId !== undefined ? { windowId } : {}),
          ...(activeOnly !== undefined ? { activeOnly } : {})
        })
      },
      {
        description: 'List browser tabs that the extension can see.'
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.activateTab', () => {
    client.exposeTool(
      'extension.activateTab',
      async (args) => runtime.activateTab(requireNumberArg(args, 'tabId')),
      {
        description: 'Activate a browser tab by id.',
        inputSchema: {
          type: 'object',
          required: ['tabId'],
          properties: {
            tabId: { type: 'number' }
          }
        }
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.reloadTab', () => {
    client.exposeTool(
      'extension.reloadTab',
      async (args) => runtime.reloadTab(args),
      {
        description: 'Reload a tab. Defaults to the current active tab.',
        inputSchema: tabTargetSchema()
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.createTab', () => {
    client.exposeTool(
      'extension.createTab',
      async (args) => {
        const record = asRecord(args)
        const active = readBoolean(record, 'active')

        return runtime.createTab({
          url: requireStringArg(args, 'url'),
          ...(active !== undefined ? { active } : {})
        })
      },
      {
        description: 'Create a new browser tab.',
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
  })

  exposeBackgroundTool(client, config, 'extension.closeTab', () => {
    client.exposeTool(
      'extension.closeTab',
      async (args) => runtime.closeTab(args),
      {
        description: 'Close a browser tab. Defaults to the current active tab.',
        inputSchema: tabTargetSchema()
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.showNotification', () => {
    client.exposeTool(
      'extension.showNotification',
      async (args) => {
        const record = asRecord(args)
        const message = readString(record, 'message')
        const title = readString(record, 'title')

        if (!message) {
          throw new Error('message is required')
        }

        return runtime.showNotification({
          message,
          ...(title ? { title } : {})
        })
      },
      {
        description: 'Show a native Chrome notification from the extension.',
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
  })

  exposeBackgroundTool(client, config, 'extension.openOptionsPage', () => {
    client.exposeTool(
      'extension.openOptionsPage',
      async () => runtime.openOptionsPage(),
      {
        description: 'Open the extension options page.'
      }
    )
  })
}

function exposeBackgroundTool(
  client: MdpClient,
  config: BackgroundClientConfig,
  name: string,
  register: () => void
): void {
  if (!isBackgroundCapabilityEnabled(config, 'tool', name)) {
    return
  }

  register()
}
