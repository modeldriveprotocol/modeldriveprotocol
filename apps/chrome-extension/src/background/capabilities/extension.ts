import type { MdpClient } from '@modeldriveprotocol/client/browser'

import {
  isBackgroundCapabilityEnabled,
  type BackgroundClientConfig
} from '#~/shared/config.js'
import { asRecord, readBoolean, readNumber, readString } from '#~/shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import {
  readRequestRecord,
  requireNumberArg,
  requireStringArg,
  tabTargetSchema
} from '#~/background/shared.js'

const EXTENSION_STATUS_PATH = '/extension/status'
const EXTENSION_CONFIG_PATH = '/extension/config'
const EXTENSION_GRANTED_ORIGINS_PATH = '/extension/granted-origins'
const EXTENSION_TABS_PATH = '/extension/tabs'
const EXTENSION_ACTIVATE_TAB_PATH = '/extension/activate-tab'
const EXTENSION_RELOAD_TAB_PATH = '/extension/reload-tab'
const EXTENSION_CREATE_TAB_PATH = '/extension/create-tab'
const EXTENSION_CLOSE_TAB_PATH = '/extension/close-tab'
const EXTENSION_SHOW_NOTIFICATION_PATH = '/extension/show-notification'
const EXTENSION_OPEN_OPTIONS_PAGE_PATH = '/extension/open-options-page'

export function registerExtensionCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  config: BackgroundClientConfig
): void {
  exposeBackgroundTool(client, config, 'extension.getStatus', () => {
    client.expose(
      EXTENSION_STATUS_PATH,
      {
        method: 'GET',
        description: 'Read the extension workspace status, multi-client connection state, and active tab summary.'
      },
      async () => runtime.getStatus(),
    )
  })

  exposeBackgroundTool(client, config, 'extension.getConfig', () => {
    client.expose(
      EXTENSION_CONFIG_PATH,
      {
        method: 'GET',
        description: 'Read the current Chrome extension workspace configuration.'
      },
      async () => runtime.getConfig(),
    )
  })

  exposeBackgroundTool(client, config, 'extension.listGrantedOrigins', () => {
    client.expose(
      EXTENSION_GRANTED_ORIGINS_PATH,
      {
        method: 'GET',
        description: 'List the currently granted extension permissions and host origins.'
      },
      async () => runtime.listGrantedOrigins(),
    )
  })

  exposeBackgroundTool(client, config, 'extension.listTabs', () => {
    client.expose(
      EXTENSION_TABS_PATH,
      {
        method: 'GET',
        description: 'List browser tabs that the extension can see.'
      },
      async (request) => {
        const record = asRecord(readRequestRecord(request))
        const windowId = readNumber(record, 'windowId')
        const activeOnly = readBoolean(record, 'activeOnly')

        return runtime.listTabs({
          ...(windowId !== undefined ? { windowId } : {}),
          ...(activeOnly !== undefined ? { activeOnly } : {})
        })
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.activateTab', () => {
    client.expose(
      EXTENSION_ACTIVATE_TAB_PATH,
      {
        method: 'POST',
        description: 'Activate a browser tab by id.',
        inputSchema: {
          type: 'object',
          required: ['tabId'],
          properties: {
            tabId: { type: 'number' }
          }
        }
      },
      async (request) =>
        runtime.activateTab(requireNumberArg(readRequestRecord(request), 'tabId'))
    )
  })

  exposeBackgroundTool(client, config, 'extension.reloadTab', () => {
    client.expose(
      EXTENSION_RELOAD_TAB_PATH,
      {
        method: 'POST',
        description: 'Reload a tab. Defaults to the current active tab.',
        inputSchema: tabTargetSchema()
      },
      async (request) => runtime.reloadTab(readRequestRecord(request))
    )
  })

  exposeBackgroundTool(client, config, 'extension.createTab', () => {
    client.expose(
      EXTENSION_CREATE_TAB_PATH,
      {
        method: 'POST',
        description: 'Create a new browser tab.',
        inputSchema: {
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string' },
            active: { type: 'boolean' }
          }
        }
      },
      async (request) => {
        const record = asRecord(readRequestRecord(request))
        const active = readBoolean(record, 'active')

        return runtime.createTab({
          url: requireStringArg(record, 'url'),
          ...(active !== undefined ? { active } : {})
        })
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.closeTab', () => {
    client.expose(
      EXTENSION_CLOSE_TAB_PATH,
      {
        method: 'POST',
        description: 'Close a browser tab. Defaults to the current active tab.',
        inputSchema: tabTargetSchema()
      },
      async (request) => runtime.closeTab(readRequestRecord(request))
    )
  })

  exposeBackgroundTool(client, config, 'extension.showNotification', () => {
    client.expose(
      EXTENSION_SHOW_NOTIFICATION_PATH,
      {
        method: 'POST',
        description: 'Show a native Chrome notification from the extension.',
        inputSchema: {
          type: 'object',
          required: ['message'],
          properties: {
            title: { type: 'string' },
            message: { type: 'string' }
          }
        }
      },
      async (request) => {
        const record = asRecord(readRequestRecord(request))
        const message = readString(record, 'message')
        const title = readString(record, 'title')

        if (!message) {
          throw new Error('message is required')
        }

        return runtime.showNotification({
          message,
          ...(title ? { title } : {})
        })
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.openOptionsPage', () => {
    client.expose(
      EXTENSION_OPEN_OPTIONS_PAGE_PATH,
      {
        method: 'POST',
        description: 'Open the extension options page.'
      },
      async () => runtime.openOptionsPage(),
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
