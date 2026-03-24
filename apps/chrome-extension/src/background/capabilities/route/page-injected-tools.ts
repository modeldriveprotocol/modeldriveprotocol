import type { MdpClient } from '@modeldriveprotocol/client'

import type { RouteClientConfig } from '#~/shared/config.js'
import { asRecord, readBoolean, readNumber, readString } from '#~/shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { requireStringArg, tabTargetSchema } from '#~/background/shared.js'

export function registerPageInjectedTools(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  routeClient: RouteClientConfig
): void {
  client.exposeTool(
    'page.runMainWorldScript',
    async (args) => {
      const record = asRecord(args)
      const source = requireStringArg(args, 'source')
      const scriptArgs = record.scriptArgs
      const scriptId = readString(record, 'scriptId')
      const force = readBoolean(record, 'force')
      return runtime.runPageCommandForRouteClient(routeClient.id, args, {
        type: 'runMainWorld',
        action: 'runScript',
        args: {
          source,
          ...(scriptArgs !== undefined ? { scriptArgs } : {}),
          ...(scriptId ? { scriptId } : {}),
          ...(force !== undefined ? { force } : {})
        }
      })
    },
    {
      description: 'Execute custom JavaScript in the page main world. The script body can return a value.',
      inputSchema: {
        type: 'object',
        required: ['source'],
        properties: {
          tabId: { type: 'number' },
          source: { type: 'string' },
          scriptArgs: { type: 'object' },
          scriptId: { type: 'string' },
          force: { type: 'boolean' }
        }
      }
    }
  )

  client.exposeTool(
    'page.injectToolScript',
    async (args) => {
      const record = asRecord(args)
      const source = requireStringArg(args, 'source')
      const scriptArgs = record.scriptArgs
      const scriptId = readString(record, 'scriptId')
      const force = readBoolean(record, 'force')
      const tabId = readNumber(record, 'tabId')

      return runtime.injectToolScriptForRouteClient(routeClient.id, {
        source,
        ...(tabId !== undefined ? { tabId } : {}),
        ...(scriptArgs !== undefined ? { scriptArgs } : {}),
        ...(scriptId ? { scriptId } : {}),
        ...(force !== undefined ? { force } : {})
      })
    },
    {
      description: 'Execute JavaScript in the page main world and keep the registered tools available to MDP.',
      inputSchema: {
        type: 'object',
        required: ['source'],
        properties: {
          tabId: { type: 'number' },
          source: { type: 'string' },
          scriptArgs: { type: 'object' },
          scriptId: { type: 'string' },
          force: { type: 'boolean' }
        }
      }
    }
  )

  client.exposeTool(
    'page.getInjectedState',
    async (args) => runtime.getInjectedStateForRouteClient(routeClient.id, args),
    {
      description: 'Read injected main-world bridge state for a target tab.',
      inputSchema: tabTargetSchema()
    }
  )

  client.exposeTool(
    'page.listInjectedTools',
    async (args) => runtime.listInjectedToolsForRouteClient(routeClient.id, args),
    {
      description: 'List page tools registered through the injected bridge.',
      inputSchema: tabTargetSchema()
    }
  )

  client.exposeTool(
    'page.callInjectedTool',
    async (args) => {
      const record = asRecord(args)
      const name = requireStringArg(args, 'name')
      const tabId = readNumber(record, 'tabId')
      const toolArgs = record.toolArgs

      return runtime.callInjectedToolForRouteClient(routeClient.id, {
        name,
        ...(tabId !== undefined ? { tabId } : {}),
        ...(toolArgs !== undefined ? { toolArgs } : {})
      })
    },
    {
      description: 'Invoke a page-local tool that has been registered through the injected bridge.',
      inputSchema: {
        type: 'object',
        required: ['name'],
        properties: {
          tabId: { type: 'number' },
          name: { type: 'string' },
          toolArgs: { type: 'object' }
        }
      }
    }
  )
}
