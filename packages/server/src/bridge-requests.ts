import type {
  AuthContext,
  CallClientResultMessage,
  HttpMethod,
  JsonValue,
  RpcArguments
} from '@modeldriveprotocol/protocol'

import type { MdpServerRuntime } from './mdp-server.js'

export type BridgeRequest =
  | {
      method: 'listClients'
      params?: {
        search?: string
      }
    }
  | {
      method: 'listPaths'
      params?: {
        clientId?: string
        search?: string
        depth?: number
      }
    }
  | {
      method: 'callPath'
      params: {
        clientId: string
        method: HttpMethod
        path: string
        query?: RpcArguments
        body?: JsonValue
        headers?: Record<string, string>
        auth?: AuthContext
      }
    }
  | {
      method: 'callPaths'
      params: {
        clientIds?: string[]
        method: HttpMethod
        path: string
        query?: RpcArguments
        body?: JsonValue
        headers?: Record<string, string>
        auth?: AuthContext
      }
    }

export interface BridgeCallPathsResultEntry {
  clientId: string
  ok: boolean
  data?: unknown
  error?: unknown
}

export async function executeBridgeRequest(
  runtime: MdpServerRuntime,
  request: BridgeRequest
): Promise<unknown> {
  switch (request.method) {
    case 'listClients':
      return {
        clients: runtime.listClients(request.params)
      }
    case 'listPaths':
      return {
        paths: runtime.capabilityIndex.listPaths(request.params)
      }
    case 'callPath':
      return await runtime.invoke({
        clientId: request.params.clientId,
        method: request.params.method,
        path: request.params.path,
        ...(request.params.query ? { query: request.params.query } : {}),
        ...(request.params.body !== undefined ? { body: request.params.body } : {}),
        ...(request.params.headers ? { headers: request.params.headers } : {}),
        ...(request.params.auth ? { auth: request.params.auth } : {})
      })
    case 'callPaths': {
      const targets = request.params.clientIds && request.params.clientIds.length > 0
        ? request.params.clientIds
        : runtime.findMatchingClientIds({
            method: request.params.method,
            path: request.params.path
          })

      if (targets.length === 0) {
        throw new Error('No matching MDP clients were found')
      }

      const results = await Promise.all(
        targets.map(async (clientId) => ({
          clientId,
          ...(await unwrapInvocation(
            runtime.invoke({
              clientId,
              method: request.params.method,
              path: request.params.path,
              ...(request.params.query ? { query: request.params.query } : {}),
              ...(request.params.body !== undefined ? { body: request.params.body } : {}),
              ...(request.params.headers ? { headers: request.params.headers } : {}),
              ...(request.params.auth ? { auth: request.params.auth } : {})
            })
          ))
        }))
      )

      return { results: results as BridgeCallPathsResultEntry[] }
    }
  }
}

async function unwrapInvocation(
  promise: Promise<CallClientResultMessage>
): Promise<{ ok: boolean; data?: unknown; error?: unknown }> {
  const result = await promise

  if (result.ok) {
    return { ok: true, data: result.data }
  }

  return {
    ok: false,
    error: result.error ?? { message: 'Unknown client error' }
  }
}
