import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import {
  type AuthContext,
  MDP_PROTOCOL_VERSION
} from '@modeldriveprotocol/protocol'

import type { BridgeRequest } from './bridge-requests.js'

const argsSchema = z.record(z.string(), z.unknown()).optional()
const authSchema = z
  .object({
    scheme: z.string().optional(),
    token: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .optional()

const callClientsSchema = {
  clientIds: z.array(z.string()).optional(),
  kind: z.enum(['tool', 'prompt', 'skill', 'resource']),
  name: z.string().optional(),
  uri: z.string().optional(),
  args: argsSchema,
  auth: authSchema
}

export type McpBridgeRequestHandler = (request: BridgeRequest) => Promise<unknown>

export function createMcpBridge(handleRequest: McpBridgeRequestHandler): McpServer {
  const server = new McpServer({
    name: 'modeldriveprotocol-server',
    version: MDP_PROTOCOL_VERSION
  })

  server.registerTool(
    'listClients',
    {
      description: 'List currently connected MDP clients and their capability summaries.'
    },
    async () => successResult(asStructuredPayload(await handleRequest({ method: 'listClients' })))
  )

  server.registerTool(
    'callClients',
    {
      description: 'Invoke a capability on one or more MDP clients using the generic bridge surface.',
      inputSchema: callClientsSchema
    },
    async ({ clientIds, kind, name, uri, args, auth }) =>
      successResult(asStructuredPayload(await handleRequest({
        method: 'callClients',
        params: {
          ...(clientIds ? { clientIds } : {}),
          kind,
          ...(name ? { name } : {}),
          ...(uri ? { uri } : {}),
          ...(args ? { args } : {}),
          ...withAuth(auth)
        }
      })))
  )

  server.registerTool(
    'listTools',
    {
      description: 'List all tools registered by connected MDP clients.',
      inputSchema: {
        clientId: z.string().optional()
      }
    },
    async ({ clientId }) =>
      successResult(asStructuredPayload(await handleRequest({
        method: 'listTools',
        ...(clientId ? { params: { clientId } } : {})
      })))
  )

  server.registerTool(
    'callTools',
    {
      description: 'Invoke a tool exposed by a specific MDP client.',
      inputSchema: {
        clientId: z.string(),
        toolName: z.string(),
        args: argsSchema,
        auth: authSchema
      }
    },
    async ({ clientId, toolName, args, auth }) =>
      invocationResult(
        await handleRequest({
          method: 'callTools',
          params: {
            clientId,
            toolName,
            ...(args ? { args } : {}),
            ...withAuth(auth)
          }
        })
      )
  )

  server.registerTool(
    'listPrompts',
    {
      description: 'List all prompts registered by connected MDP clients.',
      inputSchema: {
        clientId: z.string().optional()
      }
    },
    async ({ clientId }) =>
      successResult(asStructuredPayload(await handleRequest({
        method: 'listPrompts',
        ...(clientId ? { params: { clientId } } : {})
      })))
  )

  server.registerTool(
    'getPrompt',
    {
      description: 'Resolve a prompt exposed by a specific MDP client.',
      inputSchema: {
        clientId: z.string(),
        promptName: z.string(),
        args: argsSchema,
        auth: authSchema
      }
    },
    async ({ clientId, promptName, args, auth }) =>
      invocationResult(
        await handleRequest({
          method: 'getPrompt',
          params: {
            clientId,
            promptName,
            ...(args ? { args } : {}),
            ...withAuth(auth)
          }
        })
      )
  )

  server.registerTool(
    'listSkills',
    {
      description: 'List all skills registered by connected MDP clients.',
      inputSchema: {
        clientId: z.string().optional()
      }
    },
    async ({ clientId }) =>
      successResult(asStructuredPayload(await handleRequest({
        method: 'listSkills',
        ...(clientId ? { params: { clientId } } : {})
      })))
  )

  server.registerTool(
    'callSkills',
    {
      description: 'Invoke a skill exposed by a specific MDP client.',
      inputSchema: {
        clientId: z.string(),
        skillName: z.string(),
        args: argsSchema,
        auth: authSchema
      }
    },
    async ({ clientId, skillName, args, auth }) =>
      invocationResult(
        await handleRequest({
          method: 'callSkills',
          params: {
            clientId,
            skillName,
            ...(args ? { args } : {}),
            ...withAuth(auth)
          }
        })
      )
  )

  server.registerTool(
    'listResources',
    {
      description: 'List all resources registered by connected MDP clients.',
      inputSchema: {
        clientId: z.string().optional()
      }
    },
    async ({ clientId }) =>
      successResult(asStructuredPayload(await handleRequest({
        method: 'listResources',
        ...(clientId ? { params: { clientId } } : {})
      })))
  )

  server.registerTool(
    'readResource',
    {
      description: 'Read a resource exposed by a specific MDP client.',
      inputSchema: {
        clientId: z.string(),
        uri: z.string(),
        args: argsSchema,
        auth: authSchema
      }
    },
    async ({ clientId, uri, args, auth }) =>
      invocationResult(
        await handleRequest({
          method: 'readResource',
          params: {
            clientId,
            uri,
            ...(args ? { args } : {}),
            ...withAuth(auth)
          }
        })
      )
  )

  return server
}

function invocationResult(result: unknown) {
  if (!isInvocationResult(result)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              error: { message: 'Invalid invocation result received from bridge handler' }
            },
            null,
            2
          )
        }
      ],
      structuredContent: {
        ok: false,
        error: { message: 'Invalid invocation result received from bridge handler' }
      },
      isError: true
    }
  }

  if (!result.ok) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              error: result.error ?? { message: 'Unknown client error' }
            },
            null,
            2
          )
        }
      ],
      structuredContent: {
        ok: false,
        error: result.error ?? { message: 'Unknown client error' }
      },
      isError: true
    }
  }

  return successResult({
    ok: true,
    ...(result.data !== undefined ? { data: result.data } : {})
  })
}

function isInvocationResult(
  value: unknown
): value is { ok: boolean; data?: unknown; error?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof (value as { ok: unknown }).ok === 'boolean'
  )
}

function successResult(payload: Record<string, unknown>) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload
  }
}

function asStructuredPayload(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {
    value
  }
}

function normalizeAuth(
  auth:
    | {
        scheme?: string | undefined
        token?: string | undefined
        headers?: Record<string, string> | undefined
        metadata?: Record<string, unknown> | undefined
      }
    | undefined
): AuthContext | undefined {
  if (!auth) {
    return undefined
  }

  const normalized: AuthContext = {}

  if (auth.scheme) {
    normalized.scheme = auth.scheme
  }

  if (auth.token) {
    normalized.token = auth.token
  }

  if (auth.headers && Object.keys(auth.headers).length > 0) {
    normalized.headers = auth.headers
  }

  if (auth.metadata && Object.keys(auth.metadata).length > 0) {
    normalized.metadata = auth.metadata as NonNullable<AuthContext['metadata']>
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function withAuth(
  auth:
    | {
        scheme?: string | undefined
        token?: string | undefined
        headers?: Record<string, string> | undefined
        metadata?: Record<string, unknown> | undefined
      }
    | undefined
) {
  const normalized = normalizeAuth(auth)
  return normalized ? { auth: normalized } : {}
}
