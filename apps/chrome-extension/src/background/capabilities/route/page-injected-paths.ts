import type { MdpClient } from '@modeldriveprotocol/client'

import type { RouteClientConfig } from '#~/shared/config.js'
import { asRecord, readBoolean, readNumber, readString } from '#~/shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { readRequestRecord, requireStringArg, tabTargetSchema } from '#~/background/shared.js'

export function registerPageInjectedPaths(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  routeClient: RouteClientConfig
): void {
  client.expose(
    '/page/run-main-world-script',
    {
      method: 'POST',
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
    },
    async (request) => {
      const args = readRequestRecord(request)
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
    }
  )

  client.expose(
    '/page/inject-path-script',
    {
      method: 'POST',
      description: 'Execute JavaScript in the page main world and keep registered paths available to MDP.',
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
    },
    async (request) => {
      const args = readRequestRecord(request)
      const record = asRecord(args)
      const source = requireStringArg(args, 'source')
      const scriptArgs = record.scriptArgs
      const scriptId = readString(record, 'scriptId')
      const force = readBoolean(record, 'force')
      const tabId = readNumber(record, 'tabId')

      return runtime.injectPathScriptForRouteClient(routeClient.id, {
        source,
        ...(tabId !== undefined ? { tabId } : {}),
        ...(scriptArgs !== undefined ? { scriptArgs } : {}),
        ...(scriptId ? { scriptId } : {}),
        ...(force !== undefined ? { force } : {})
      })
    }
  )

  client.expose(
    '/page/injected-state',
    {
      method: 'GET',
      description: 'Read injected main-world bridge state for a target tab.',
      inputSchema: tabTargetSchema()
    },
    async (request) =>
      runtime.getInjectedStateForRouteClient(routeClient.id, readRequestRecord(request))
  )

  client.expose(
    '/page/injected-paths',
    {
      method: 'GET',
      description: 'List page paths registered through the injected bridge.',
      inputSchema: tabTargetSchema()
    },
    async (request) =>
      runtime.listInjectedPathsForRouteClient(routeClient.id, readRequestRecord(request))
  )

  client.expose(
    '/page/call-injected-path',
    {
      method: 'POST',
      description: 'Invoke a page-local path that has been registered through the injected bridge.',
      inputSchema: {
        type: 'object',
        required: ['path'],
        properties: {
          tabId: { type: 'number' },
          path: { type: 'string' },
          pathArgs: { type: 'object' }
        }
      }
    },
    async (request) => {
      const args = readRequestRecord(request)
      const record = asRecord(args)
      const path = requireStringArg(args, 'path')
      const tabId = readNumber(record, 'tabId')
      const pathArgs = record.pathArgs

      return runtime.callInjectedPathForRouteClient(routeClient.id, {
        path,
        ...(tabId !== undefined ? { tabId } : {}),
        ...(pathArgs !== undefined ? { pathArgs } : {})
      })
    }
  )
}
