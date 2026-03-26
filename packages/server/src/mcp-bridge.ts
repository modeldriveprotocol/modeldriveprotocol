import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import {
  type AuthContext,
  type IndexedPathDescriptor,
  type JsonObject,
  type JsonValue,
  type RpcArguments,
  MDP_PROTOCOL_VERSION,
  isJsonObject,
  isJsonValue
} from '@modeldriveprotocol/protocol'

import type { BridgeRequest } from './bridge-requests.js'

const methodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const legacyCapabilityKindSchema = z.enum(['tool', 'prompt', 'skill', 'resource'])
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
const legacyListInputSchema = z
  .object({
    clientId: z.string().optional()
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
    'listTools',
    {
      description: 'List tool descriptors registered by connected MDP clients.',
      inputSchema: legacyListInputSchema
    },
    async (args) =>
      successResult({
        tools: (await listIndexedPaths(handleRequest, {
          ...(args?.clientId ? { clientId: args.clientId } : {}),
          depth: Number.MAX_SAFE_INTEGER
        }))
          .filter((descriptor) => isLegacyBridgeKind(descriptor, 'tool'))
          .map((descriptor) => ({
            clientId: descriptor.clientId,
            clientName: descriptor.clientName,
            name: getLegacyBridgeIdentifier(descriptor, 'tool') as string,
            ...(descriptor.description ? { description: descriptor.description } : {}),
            ...(descriptor.type === 'endpoint' && descriptor.inputSchema
              ? { inputSchema: descriptor.inputSchema }
              : {})
          }))
      })
  )

  server.registerTool(
    'listPrompts',
    {
      description: 'List prompt descriptors registered by connected MDP clients.',
      inputSchema: legacyListInputSchema
    },
    async (args) =>
      successResult({
        prompts: (await listIndexedPaths(handleRequest, {
          ...(args?.clientId ? { clientId: args.clientId } : {}),
          depth: Number.MAX_SAFE_INTEGER
        }))
          .filter((descriptor) => isLegacyBridgeKind(descriptor, 'prompt'))
          .map((descriptor) => ({
            clientId: descriptor.clientId,
            clientName: descriptor.clientName,
            name: getLegacyBridgeIdentifier(descriptor, 'prompt') as string,
            ...(descriptor.description ? { description: descriptor.description } : {}),
            ...(descriptor.type === 'prompt' && descriptor.inputSchema
              ? { inputSchema: descriptor.inputSchema }
              : {})
          }))
      })
  )

  server.registerTool(
    'listSkills',
    {
      description: 'List skill descriptors registered by connected MDP clients.',
      inputSchema: legacyListInputSchema
    },
    async (args) =>
      successResult({
        skills: (await listIndexedPaths(handleRequest, {
          ...(args?.clientId ? { clientId: args.clientId } : {}),
          depth: Number.MAX_SAFE_INTEGER
        }))
          .filter((descriptor) => isLegacyBridgeKind(descriptor, 'skill'))
          .map((descriptor) => ({
            clientId: descriptor.clientId,
            clientName: descriptor.clientName,
            name: getLegacyBridgeIdentifier(descriptor, 'skill') as string,
            ...(descriptor.description ? { description: descriptor.description } : {}),
            ...(descriptor.type === 'skill' && descriptor.contentType
              ? { contentType: descriptor.contentType }
              : {})
          }))
      })
  )

  server.registerTool(
    'listResources',
    {
      description: 'List resource descriptors registered by connected MDP clients.',
      inputSchema: legacyListInputSchema
    },
    async (args) =>
      successResult({
        resources: (await listIndexedPaths(handleRequest, {
          ...(args?.clientId ? { clientId: args.clientId } : {}),
          depth: Number.MAX_SAFE_INTEGER
        }))
          .filter((descriptor) => isLegacyBridgeKind(descriptor, 'resource'))
          .map((descriptor) => ({
            clientId: descriptor.clientId,
            clientName: descriptor.clientName,
            uri: getLegacyBridgeIdentifier(descriptor, 'resource') as string,
            ...(descriptor.legacy?.kind === 'resource' && descriptor.legacy.name
              ? { name: descriptor.legacy.name }
              : {}),
            ...(descriptor.description ? { description: descriptor.description } : {}),
            ...(descriptor.type === 'endpoint' && descriptor.contentType
              ? { mimeType: descriptor.contentType }
              : {})
          }))
      })
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
    'callTools',
    {
      description: 'Invoke one exact legacy tool on one exact MDP client.',
      inputSchema: {
        clientId: z.string(),
        toolName: z.string(),
        args: querySchema,
        auth: authSchema
      }
    },
    async ({ clientId, toolName, args, auth }) =>
      invocationResult(
        await invokeLegacyPath(handleRequest, {
          clientId,
          kind: 'tool',
          identifier: toolName,
          ...(args ? { args: normalizeQuery(args) } : {}),
          ...withAuth(auth)
        })
      )
  )

  server.registerTool(
    'getPrompt',
    {
      description: 'Resolve one exact legacy prompt on one exact MDP client.',
      inputSchema: {
        clientId: z.string(),
        promptName: z.string(),
        args: querySchema,
        auth: authSchema
      }
    },
    async ({ clientId, promptName, args, auth }) =>
      invocationResult(
        await invokeLegacyPath(handleRequest, {
          clientId,
          kind: 'prompt',
          identifier: promptName,
          ...(args ? { args: normalizeQuery(args) } : {}),
          ...withAuth(auth)
        })
      )
  )

  server.registerTool(
    'callSkills',
    {
      description: 'Resolve one exact legacy skill on one exact MDP client.',
      inputSchema: {
        clientId: z.string(),
        skillName: z.string(),
        args: querySchema,
        auth: authSchema
      }
    },
    async ({ clientId, skillName, args, auth }) =>
      invocationResult(
        await invokeLegacyPath(handleRequest, {
          clientId,
          kind: 'skill',
          identifier: skillName,
          ...(args ? { args: normalizeQuery(args) } : {}),
          ...withAuth(auth)
        })
      )
  )

  server.registerTool(
    'readResource',
    {
      description: 'Read one exact legacy resource on one exact MDP client.',
      inputSchema: {
        clientId: z.string(),
        uri: z.string(),
        args: querySchema,
        auth: authSchema
      }
    },
    async ({ clientId, uri, args, auth }) =>
      invocationResult(
        await invokeLegacyPath(handleRequest, {
          clientId,
          kind: 'resource',
          identifier: uri,
          ...(args ? { args: normalizeQuery(args) } : {}),
          ...withAuth(auth)
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

  server.registerTool(
    'callClients',
    {
      description: 'Invoke one legacy capability on one or more MDP clients.',
      inputSchema: {
        clientIds: z.array(z.string()).optional(),
        kind: legacyCapabilityKindSchema,
        name: z.string().optional(),
        uri: z.string().optional(),
        args: querySchema,
        auth: authSchema
      }
    },
    async ({ clientIds, kind, name, uri, args, auth }) =>
      successResult(await invokeLegacyClients(handleRequest, {
        ...(clientIds ? { clientIds } : {}),
        kind,
        identifier: requireLegacyIdentifier(kind, name, uri),
        ...(args ? { args: normalizeQuery(args) } : {}),
        ...withAuth(auth)
      }))
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

async function listIndexedPaths(
  handleRequest: McpBridgeRequestHandler,
  options: {
    clientId?: string
    search?: string
    depth?: number
  } = {}
): Promise<IndexedPathDescriptor[]> {
  const result = await handleRequest({
    method: 'listPaths',
    ...(options.clientId || options.search || options.depth !== undefined
      ? { params: options }
      : {})
  })

  if (
    !isJsonObject(result) ||
    !Array.isArray(result.paths) ||
    !result.paths.every(isIndexedPathDescriptor)
  ) {
    throw new Error('Invalid listPaths payload received from bridge handler')
  }

  return result.paths as unknown as IndexedPathDescriptor[]
}

function isIndexedPathDescriptor(value: unknown): value is IndexedPathDescriptor {
  return (
    isJsonObject(value) &&
    typeof value.clientId === 'string' &&
    typeof value.clientName === 'string' &&
    typeof value.path === 'string' &&
    typeof value.type === 'string'
  )
}

function isLegacyBridgeKind(
  descriptor: IndexedPathDescriptor,
  kind: 'tool' | 'prompt' | 'skill' | 'resource'
): boolean {
  switch (kind) {
    case 'tool':
      return descriptor.type === 'endpoint' && descriptor.legacy?.kind !== 'resource'
    case 'prompt':
      return descriptor.type === 'prompt'
    case 'skill':
      return descriptor.type === 'skill'
    case 'resource':
      return descriptor.type === 'endpoint' && descriptor.legacy?.kind === 'resource'
  }
}

function getLegacyBridgeIdentifier(
  descriptor: IndexedPathDescriptor,
  kind: 'tool' | 'prompt' | 'skill' | 'resource'
): string | undefined {
  if (!isLegacyBridgeKind(descriptor, kind)) {
    return undefined
  }

  switch (kind) {
    case 'tool':
      return descriptor.legacy?.kind === 'tool' ? descriptor.legacy.name : descriptor.path
    case 'prompt':
      return descriptor.legacy?.kind === 'prompt' ? descriptor.legacy.name : descriptor.path
    case 'skill':
      return descriptor.legacy?.kind === 'skill' ? descriptor.legacy.name : descriptor.path
    case 'resource':
      return descriptor.legacy?.kind === 'resource' ? descriptor.legacy.uri : undefined
  }
}

async function invokeLegacyPath(
  handleRequest: McpBridgeRequestHandler,
  request: {
    clientId: string
    kind: 'tool' | 'prompt' | 'skill' | 'resource'
    identifier: string
    args?: RpcArguments
    auth?: AuthContext
  }
) {
  const descriptors = await listIndexedPaths(handleRequest, {
    clientId: request.clientId,
    depth: Number.MAX_SAFE_INTEGER
  })
  const descriptor = descriptors.find(
    (entry) =>
      entry.clientId === request.clientId &&
      getLegacyBridgeIdentifier(entry, request.kind) === request.identifier
  )

  if (!descriptor) {
    throw new Error(
      `Unknown ${request.kind} "${request.identifier}" for client "${request.clientId}"`
    )
  }

  return handleRequest({
    method: 'callPath',
    params: {
      clientId: request.clientId,
      method: descriptor.type === 'endpoint' ? descriptor.method : 'GET',
      path: descriptor.path,
      ...withLegacyArguments(descriptor, request.args),
      ...(request.auth ? { auth: request.auth } : {})
    }
  })
}

async function invokeLegacyClients(
  handleRequest: McpBridgeRequestHandler,
  request: {
    clientIds?: string[]
    kind: 'tool' | 'prompt' | 'skill' | 'resource'
    identifier: string
    args?: RpcArguments
    auth?: AuthContext
  }
): Promise<{ results: Array<{ clientId: string; ok: boolean; data?: unknown; error?: unknown }> }> {
  const descriptors = (await listIndexedPaths(handleRequest, {
    depth: Number.MAX_SAFE_INTEGER
  })).filter(
    (descriptor) =>
      (!request.clientIds || request.clientIds.includes(descriptor.clientId)) &&
      getLegacyBridgeIdentifier(descriptor, request.kind) === request.identifier
  )

  if (descriptors.length === 0) {
    throw new Error('No matching MDP clients were found')
  }

  const results = await Promise.all(
    descriptors.map(async (descriptor) => ({
      clientId: descriptor.clientId,
      ...(await invokeLegacyDescriptor(handleRequest, descriptor, request))
    }))
  )

  return { results }
}

async function invokeLegacyDescriptor(
  handleRequest: McpBridgeRequestHandler,
  descriptor: IndexedPathDescriptor,
  request: {
    identifier: string
    args?: RpcArguments
    auth?: AuthContext
  }
): Promise<{ ok: boolean; data?: unknown; error?: unknown }> {
  try {
    const result = await handleRequest({
      method: 'callPath',
      params: {
        clientId: descriptor.clientId,
        method: descriptor.type === 'endpoint' ? descriptor.method : 'GET',
        path: descriptor.path,
        ...withLegacyArguments(descriptor, request.args),
        ...(request.auth ? { auth: request.auth } : {})
      }
    })

    return normalizeInvocationValue(result)
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error))

    return {
      ok: false,
      error: {
        message: normalized.message
      }
    }
  }
}

function withLegacyArguments(
  descriptor: IndexedPathDescriptor,
  args: RpcArguments | undefined
) {
  if (!args) {
    return {}
  }

  if (descriptor.type === 'endpoint' && descriptor.method !== 'GET') {
    return {
      body: normalizeBody(args)
    }
  }

  return {
    query: normalizeQuery(args)
  }
}

function normalizeInvocationValue(
  result: unknown
): { ok: boolean; data?: unknown; error?: unknown } {
  if (!isInvocationResult(result)) {
    return {
      ok: false,
      error: {
        message: 'Invalid invocation result received from bridge handler'
      }
    }
  }

  if (result.ok) {
    return {
      ok: true,
      ...(result.data !== undefined ? { data: result.data } : {})
    }
  }

  return {
    ok: false,
    error: result.error ?? { message: 'Unknown client error' }
  }
}

function requireLegacyIdentifier(
  kind: 'tool' | 'prompt' | 'skill' | 'resource',
  name: string | undefined,
  uri: string | undefined
): string {
  if (kind === 'resource') {
    if (!uri) {
      throw new Error('uri is required when kind is "resource"')
    }

    return uri
  }

  if (!name) {
    throw new Error('name is required unless kind is "resource"')
  }

  return name
}
