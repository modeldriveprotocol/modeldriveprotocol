import type { MdpClient } from '@modeldriveprotocol/client'

import {
  isBackgroundCapabilityEnabled,
  type ClientIconKey,
  type RouteRuleMode,
  type BackgroundClientConfig
} from '#~/shared/config.js'
import {
  asRecord,
  readBoolean,
  readString,
  readStringArray
} from '#~/shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { readRequestRecord } from '#~/background/shared.js'

const EXTENSION_CLIENTS_PATH = '/extension/clients'
const EXTENSION_CREATE_CLIENT_PATH = '/extension/clients/create'
const EXTENSION_UPDATE_CLIENT_PATH = '/extension/clients/update'
const EXTENSION_DELETE_CLIENT_PATH = '/extension/clients/delete'
const EXTENSION_ADD_EXPOSE_RULE_PATH = '/extension/clients/add-expose-rule'

export function registerWorkspaceCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  config: BackgroundClientConfig
): void {
  exposeBackgroundTool(client, config, 'extension.listClients', () => {
    client.expose(
      EXTENSION_CLIENTS_PATH,
      {
        method: 'GET',
        description:
          'List stored background and route clients in the Chrome extension workspace.'
      },
      async () => runtime.listWorkspaceClients(),
    )
  })

  exposeBackgroundTool(client, config, 'extension.createClient', () => {
    client.expose(
      EXTENSION_CREATE_CLIENT_PATH,
      {
        method: 'POST',
        description:
          'Create a stored background or route client in the Chrome extension workspace.',
        inputSchema: {
          type: 'object',
          required: ['kind'],
          properties: {
            kind: { type: 'string', enum: ['background', 'route'] },
            id: { type: 'string' },
            clientId: { type: 'string' },
            clientName: { type: 'string' },
            clientDescription: { type: 'string' },
            icon: { type: 'string' },
            enabled: { type: 'boolean' },
            favorite: { type: 'boolean' },
            matchPatterns: { type: 'array', items: { type: 'string' } },
            autoInjectBridge: { type: 'boolean' },
            pathScriptSource: { type: 'string' },
            disabledTools: { type: 'array', items: { type: 'string' } },
            disabledResources: { type: 'array', items: { type: 'string' } },
            disabledSkills: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      async (request) => {
        const record = asRecord(readRequestRecord(request))
        const kind = readString(record, 'kind')

        if (kind !== 'background' && kind !== 'route') {
          throw new Error('kind must be "background" or "route"')
        }

        return runtime.createWorkspaceClient({
          kind,
          ...(readString(record, 'id') ? { id: readString(record, 'id') } : {}),
          ...(readString(record, 'clientId')
            ? { clientId: readString(record, 'clientId') }
            : {}),
          ...(readString(record, 'clientName')
            ? { clientName: readString(record, 'clientName') }
            : {}),
          ...(readString(record, 'clientDescription')
            ? { clientDescription: readString(record, 'clientDescription') }
            : {}),
          ...(readString(record, 'icon')
            ? { icon: readString(record, 'icon') as ClientIconKey }
            : {}),
          ...(readBoolean(record, 'enabled') !== undefined
            ? { enabled: readBoolean(record, 'enabled') }
            : {}),
          ...(readBoolean(record, 'favorite') !== undefined
            ? { favorite: readBoolean(record, 'favorite') }
            : {}),
          ...(readStringArray(record, 'matchPatterns')
            ? { matchPatterns: readStringArray(record, 'matchPatterns') }
            : {}),
          ...(readBoolean(record, 'autoInjectBridge') !== undefined
            ? { autoInjectBridge: readBoolean(record, 'autoInjectBridge') }
            : {}),
          ...(readString(record, 'pathScriptSource') !== undefined
            ? { pathScriptSource: readString(record, 'pathScriptSource') }
            : {}),
          ...(readStringArray(record, 'disabledTools')
            ? { disabledTools: readStringArray(record, 'disabledTools') }
            : {}),
          ...(readStringArray(record, 'disabledResources')
            ? { disabledResources: readStringArray(record, 'disabledResources') }
            : {}),
          ...(readStringArray(record, 'disabledSkills')
            ? { disabledSkills: readStringArray(record, 'disabledSkills') }
            : {})
        })
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.updateClient', () => {
    client.expose(
      EXTENSION_UPDATE_CLIENT_PATH,
      {
        method: 'POST',
        description:
          'Update a stored background or route client by internal id or clientId.',
        inputSchema: {
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
            disabledTools: { type: 'array', items: { type: 'string' } },
            disabledResources: { type: 'array', items: { type: 'string' } },
            disabledSkills: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      async (request) => {
        const record = asRecord(readRequestRecord(request))
        const kind = readString(record, 'kind')

        return runtime.updateWorkspaceClient({
          ...(kind === 'background' || kind === 'route' ? { kind } : {}),
          ...(readString(record, 'id') ? { id: readString(record, 'id') } : {}),
          ...(readString(record, 'clientId')
            ? { clientId: readString(record, 'clientId') }
            : {}),
          ...(readString(record, 'nextClientId')
            ? { nextClientId: readString(record, 'nextClientId') }
            : {}),
          ...(readString(record, 'clientName')
            ? { clientName: readString(record, 'clientName') }
            : {}),
          ...(readString(record, 'clientDescription')
            ? { clientDescription: readString(record, 'clientDescription') }
            : {}),
          ...(readString(record, 'icon')
            ? { icon: readString(record, 'icon') as ClientIconKey }
            : {}),
          ...(readBoolean(record, 'enabled') !== undefined
            ? { enabled: readBoolean(record, 'enabled') }
            : {}),
          ...(readBoolean(record, 'favorite') !== undefined
            ? { favorite: readBoolean(record, 'favorite') }
            : {}),
          ...(readStringArray(record, 'matchPatterns')
            ? { matchPatterns: readStringArray(record, 'matchPatterns') }
            : {}),
          ...(readBoolean(record, 'autoInjectBridge') !== undefined
            ? { autoInjectBridge: readBoolean(record, 'autoInjectBridge') }
            : {}),
          ...(readString(record, 'pathScriptSource') !== undefined
            ? { pathScriptSource: readString(record, 'pathScriptSource') }
            : {}),
          ...(readStringArray(record, 'disabledTools')
            ? { disabledTools: readStringArray(record, 'disabledTools') }
            : {}),
          ...(readStringArray(record, 'disabledResources')
            ? { disabledResources: readStringArray(record, 'disabledResources') }
            : {}),
          ...(readStringArray(record, 'disabledSkills')
            ? { disabledSkills: readStringArray(record, 'disabledSkills') }
            : {})
        })
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.deleteClient', () => {
    client.expose(
      EXTENSION_DELETE_CLIENT_PATH,
      {
        method: 'POST',
        description:
          'Delete a stored background or route client by internal id or clientId.',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['background', 'route'] },
            id: { type: 'string' },
            clientId: { type: 'string' }
          }
        }
      },
      async (request) => {
        const record = asRecord(readRequestRecord(request))
        const kind = readString(record, 'kind')

        return runtime.deleteWorkspaceClient({
          ...(kind === 'background' || kind === 'route' ? { kind } : {}),
          ...(readString(record, 'id') ? { id: readString(record, 'id') } : {}),
          ...(readString(record, 'clientId')
            ? { clientId: readString(record, 'clientId') }
            : {})
        })
      }
    )
  })

  exposeBackgroundTool(client, config, 'extension.addClientExposeRule', () => {
    client.expose(
      EXTENSION_ADD_EXPOSE_RULE_PATH,
      {
        method: 'POST',
        description:
          'Persist a new route expose rule for a stored route client.',
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
      },
      async (request) => {
        const record = asRecord(readRequestRecord(request))

        return runtime.addExposeRuleToClient({
          kind: 'route',
          ...(readString(record, 'id') ? { id: readString(record, 'id') } : {}),
          ...(readString(record, 'clientId')
            ? { clientId: readString(record, 'clientId') }
            : {}),
          value: readString(record, 'value') ?? '',
          ...(readString(record, 'mode')
            ? { mode: readString(record, 'mode') as RouteRuleMode }
            : {}),
          ...(readBoolean(record, 'prepend') !== undefined
            ? { prepend: readBoolean(record, 'prepend') }
            : {})
        })
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
