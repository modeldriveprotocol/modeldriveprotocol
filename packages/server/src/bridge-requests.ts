import type {
  AuthContext,
  CallClientResultMessage,
  CapabilityKind,
  RpcArguments,
} from '@modeldriveprotocol/protocol'

import type { MdpServerRuntime } from './mdp-server.js'

export type BridgeRequest =
  | {
      method: 'listClients'
    }
  | {
      method: 'callClients'
      params: {
        clientIds?: string[]
        kind: CapabilityKind
        name?: string
        uri?: string
        args?: RpcArguments
        auth?: AuthContext
      }
    }
  | {
      method: 'listTools'
      params?: {
        clientId?: string
      }
    }
  | {
      method: 'callTools'
      params: {
        clientId: string
        toolName: string
        args?: RpcArguments
        auth?: AuthContext
      }
    }
  | {
      method: 'listPrompts'
      params?: {
        clientId?: string
      }
    }
  | {
      method: 'getPrompt'
      params: {
        clientId: string
        promptName: string
        args?: RpcArguments
        auth?: AuthContext
      }
    }
  | {
      method: 'listSkills'
      params?: {
        clientId?: string
      }
    }
  | {
      method: 'callSkills'
      params: {
        clientId: string
        skillName: string
        args?: RpcArguments
        auth?: AuthContext
      }
    }
  | {
      method: 'listResources'
      params?: {
        clientId?: string
      }
    }
  | {
      method: 'readResource'
      params: {
        clientId: string
        uri: string
        args?: RpcArguments
        auth?: AuthContext
      }
    }

export interface BridgeCallClientsResultEntry {
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
        clients: runtime.listClients()
      }
    case 'callClients': {
      const targets = request.params.clientIds && request.params.clientIds.length > 0
        ? request.params.clientIds
        : runtime.findMatchingClientIds({
            kind: request.params.kind,
            ...(request.params.name ? { name: request.params.name } : {}),
            ...(request.params.uri ? { uri: request.params.uri } : {})
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
              kind: request.params.kind,
              ...(request.params.name ? { name: request.params.name } : {}),
              ...(request.params.uri ? { uri: request.params.uri } : {}),
              ...(request.params.args ? { args: request.params.args } : {}),
              ...(request.params.auth ? { auth: request.params.auth } : {})
            })
          ))
        }))
      )

      return { results: results as BridgeCallClientsResultEntry[] }
    }
    case 'listTools':
      return {
        tools: runtime.capabilityIndex.listTools(request.params?.clientId)
      }
    case 'callTools':
      return await runtime.invoke({
        clientId: request.params.clientId,
        kind: 'tool',
        name: request.params.toolName,
        ...(request.params.args ? { args: request.params.args } : {}),
        ...(request.params.auth ? { auth: request.params.auth } : {})
      })
    case 'listPrompts':
      return {
        prompts: runtime.capabilityIndex.listPrompts(request.params?.clientId)
      }
    case 'getPrompt':
      return await runtime.invoke({
        clientId: request.params.clientId,
        kind: 'prompt',
        name: request.params.promptName,
        ...(request.params.args ? { args: request.params.args } : {}),
        ...(request.params.auth ? { auth: request.params.auth } : {})
      })
    case 'listSkills':
      return {
        skills: runtime.capabilityIndex.listSkills(request.params?.clientId)
      }
    case 'callSkills':
      return await runtime.invoke({
        clientId: request.params.clientId,
        kind: 'skill',
        name: request.params.skillName,
        ...(request.params.args ? { args: request.params.args } : {}),
        ...(request.params.auth ? { auth: request.params.auth } : {})
      })
    case 'listResources':
      return {
        resources: runtime.capabilityIndex.listResources(request.params?.clientId)
      }
    case 'readResource':
      return await runtime.invoke({
        clientId: request.params.clientId,
        kind: 'resource',
        uri: request.params.uri,
        ...(request.params.args ? { args: request.params.args } : {}),
        ...(request.params.auth ? { auth: request.params.auth } : {})
      })
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
