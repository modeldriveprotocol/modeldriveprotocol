import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import {
  type AuthContext,
  type JsonObject,
  type JsonValue,
  type RpcArguments,
  MDP_PROTOCOL_VERSION,
  isJsonObject,
  isJsonValue
} from '@modeldriveprotocol/protocol'

import type { BridgeRequest } from './bridge-requests.js'

const methodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const positiveIntegerSchema = z.number().int().positive().optional()
const listClientsInputSchema = z
  .object({
    search: z.string().optional()
  })
  .optional()
const listPathsInputSchema = z
  .object({
    clientId: z.string().optional(),
    search: z.string().optional(),
    depth: positiveIntegerSchema
  })
  .optional()
const querySchema = z.record(z.string(), z.unknown()).optional()
const bodySchema = z.unknown().optional()
const headersSchema = z.record(z.string(), z.string()).optional()
const authSchema = z
  .object({
    scheme: z.string().optional(),
    token: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .optional()

export type McpBridgeRequestHandler = (request: BridgeRequest) => Promise<unknown>

export function createMcpBridge(handleRequest: McpBridgeRequestHandler): McpServer {
  const server = new McpServer({
    name: 'modeldriveprotocol-server',
    version: MDP_PROTOCOL_VERSION
  })

  server.registerTool(
    'listClients',
    {
      description: 'List currently connected MDP clients and their path catalogs.',
      inputSchema: listClientsInputSchema
    },
    async (args) =>
      successResult(asStructuredPayload(await handleRequest({
        method: 'listClients',
        ...(args?.search ? { params: { search: args.search } } : {})
      })))
  )

  server.registerTool(
    'listPaths',
    {
      description: 'List path descriptors registered by connected MDP clients.',
      inputSchema: listPathsInputSchema
    },
    async (args) =>
      successResult(asStructuredPayload(await handleRequest({
        method: 'listPaths',
        ...(args?.clientId || args?.search || args?.depth !== undefined
          ? {
              params: {
                ...(args?.clientId ? { clientId: args.clientId } : {}),
                ...(args?.search ? { search: args.search } : {}),
                ...(args?.depth !== undefined ? { depth: args.depth } : {})
              }
            }
          : {})
      })))
  )

  server.registerTool(
    'callPath',
    {
      description: 'Invoke one exact path on one exact MDP client.',
      inputSchema: {
        clientId: z.string(),
        method: methodSchema,
        path: z.string(),
        query: querySchema,
        body: bodySchema,
        headers: headersSchema,
        auth: authSchema
      }
    },
    async ({ clientId, method, path, query, body, headers, auth }) =>
      invocationResult(
        await handleRequest({
          method: 'callPath',
          params: {
            clientId,
            method,
            path,
            ...(query ? { query: normalizeQuery(query) } : {}),
            ...(body !== undefined ? { body: normalizeBody(body) } : {}),
            ...(headers ? { headers } : {}),
            ...withAuth(auth)
          }
        })
      )
  )

  server.registerTool(
    'callPaths',
    {
      description: 'Invoke one path on one or more MDP clients.',
      inputSchema: {
        clientIds: z.array(z.string()).optional(),
        method: methodSchema,
        path: z.string(),
        query: querySchema,
        body: bodySchema,
        headers: headersSchema,
        auth: authSchema
      }
    },
    async ({ clientIds, method, path, query, body, headers, auth }) =>
      successResult(asStructuredPayload(await handleRequest({
        method: 'callPaths',
        params: {
          ...(clientIds ? { clientIds } : {}),
          method,
          path,
          ...(query ? { query: normalizeQuery(query) } : {}),
          ...(body !== undefined ? { body: normalizeBody(body) } : {}),
          ...(headers ? { headers } : {}),
          ...withAuth(auth)
        }
      })))
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

  const metadata = normalizeMetadata(auth.metadata)

  return {
    ...(auth.scheme ? { scheme: auth.scheme } : {}),
    ...(auth.token ? { token: auth.token } : {}),
    ...(auth.headers ? { headers: auth.headers } : {}),
    ...(metadata ? { metadata } : {})
  }
}

function withAuth(auth: Parameters<typeof normalizeAuth>[0]) {
  const normalized = normalizeAuth(auth)
  return normalized ? { auth: normalized } : {}
}

function normalizeQuery(query: Record<string, unknown>): RpcArguments {
  return query
}

function normalizeBody(body: unknown): JsonValue {
  if (!isJsonValue(body)) {
    throw new Error('Bridge request body must be JSON-serializable')
  }

  return body
}

function normalizeMetadata(
  metadata: Record<string, unknown> | undefined
): JsonObject | undefined {
  if (metadata === undefined) {
    return undefined
  }

  if (!isJsonObject(metadata) || !Object.values(metadata).every((value) => isJsonValue(value))) {
    throw new Error('Bridge auth metadata must be a JSON object')
  }

  return metadata
}
