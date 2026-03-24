import type { MdpClient } from '@modeldriveprotocol/client'

import { asRecord, readBoolean, readNumber, readString } from '#~/shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { requireNumberArg, requireStringArg, tabTargetSchema } from '#~/background/shared.js'

export function registerExtensionCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi
): void {
  client.exposeTool(
    'extension.getStatus',
    async () => runtime.getStatus(),
    {
      description: 'Read the extension workspace status, multi-client connection state, and active tab summary.'
    }
  )

  client.exposeTool(
    'extension.getConfig',
    async () => runtime.getConfig(),
    {
      description: 'Read the current Chrome extension workspace configuration.'
    }
  )

  client.exposeTool(
    'extension.listGrantedOrigins',
    async () => runtime.listGrantedOrigins(),
    {
      description: 'List the currently granted extension permissions and host origins.'
    }
  )

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

  client.exposeTool(
    'extension.reloadTab',
    async (args) => runtime.reloadTab(args),
    {
      description: 'Reload a tab. Defaults to the current active tab.',
      inputSchema: tabTargetSchema()
    }
  )

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

  client.exposeTool(
    'extension.closeTab',
    async (args) => runtime.closeTab(args),
    {
      description: 'Close a browser tab. Defaults to the current active tab.',
      inputSchema: tabTargetSchema()
    }
  )

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

  client.exposeTool(
    'extension.openOptionsPage',
    async () => runtime.openOptionsPage(),
    {
      description: 'Open the extension options page.'
    }
  )
}
