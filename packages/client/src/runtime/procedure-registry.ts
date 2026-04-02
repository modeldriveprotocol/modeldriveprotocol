import type {
  CallClientMessage,
  ClientDescriptor,
  PathDescriptor
} from '@modeldriveprotocol/protocol'
import {
  comparePathSpecificity,
  isPathPattern,
  isPromptPath,
  isSkillPath,
  matchPathPattern
} from '@modeldriveprotocol/protocol'

import type {
  ClientInfo,
  ExposeEndpointOptions,
  ExposePathOptions,
  ExposePromptOptions,
  ExposeSkillOptions,
  PathHandler,
  PathInvocation,
  PathInvocationContext,
  PathInvocationMiddleware,
  PathRequest,
  StaticPathDefinition
} from '../types.js'

interface ProcedureEntry {
  descriptor: PathDescriptor
  handler: PathHandler
}

interface ResolvedEntry {
  descriptor: PathDescriptor
  handler: PathHandler
  params: Record<string, unknown>
  specificity: number[]
}

export class ProcedureRegistry {
  private readonly entries: ProcedureEntry[] = []
  private readonly invocationMiddlewares: PathInvocationMiddleware[] = []

  useInvocationMiddleware(middleware: PathInvocationMiddleware): this {
    this.invocationMiddlewares.push(middleware)
    return this
  }

  removeInvocationMiddleware(middleware: PathInvocationMiddleware): boolean {
    const index = this.invocationMiddlewares.indexOf(middleware)

    if (index < 0) {
      return false
    }

    this.invocationMiddlewares.splice(index, 1)
    return true
  }

  expose(
    path: string,
    definition: StaticPathDefinition | ExposePathOptions,
    handler?: PathHandler
  ): this {
    const descriptor = createPathDescriptor(path, definition)
    const resolvedHandler = createPathHandler(path, descriptor, definition, handler)
    const entry: ProcedureEntry = {
      descriptor,
      handler: resolvedHandler
    }
    const key = createRegistrationKey(descriptor)
    const existingIndex = this.entries.findIndex(
      (current) => createRegistrationKey(current.descriptor) === key
    )

    if (existingIndex >= 0) {
      this.entries.splice(existingIndex, 1, entry)
    } else {
      this.entries.push(entry)
    }

    return this
  }

  unexpose(path: string, method?: ExposeEndpointOptions['method']): boolean {
    assertPathPattern(path)

    const index = this.entries.findIndex((entry) => {
      if (entry.descriptor.path !== path) {
        return false
      }

      if (entry.descriptor.type === 'endpoint') {
        return method !== undefined && entry.descriptor.method === method
      }

      return true
    })

    if (index < 0) {
      return false
    }

    this.entries.splice(index, 1)
    return true
  }

  describe(client: ClientInfo): ClientDescriptor {
    return {
      ...client,
      paths: this.describePaths()
    }
  }

  describePaths(): PathDescriptor[] {
    return this.entries.map(({ descriptor }) => descriptor)
  }

  invoke(
    message: Pick<
      CallClientMessage,
      'requestId' | 'clientId' | 'method' | 'path' | 'params' | 'query' | 'body' | 'headers' | 'auth'
    >
  ): Promise<unknown> {
    const entry = this.resolveEntry(message.method, message.path)

    if (!entry) {
      throw new Error(`Unknown path "${message.path}" for method "${message.method}"`)
    }

    const invocation: PathInvocation = {
      requestId: message.requestId,
      clientId: message.clientId,
      type: entry.descriptor.type,
      method: message.method,
      path: message.path,
      params: asArgumentRecord(message.params ?? entry.params),
      queries: asArgumentRecord(message.query),
      ...(message.body !== undefined ? { body: message.body } : {}),
      headers: message.headers ?? {},
      ...(message.auth ? { auth: message.auth } : {})
    }

    return this.runWithMiddlewares(invocation, entry.handler)
  }

  private resolveEntry(
    method: CallClientMessage['method'],
    path: string
  ): ResolvedEntry | undefined {
    let bestMatch: ResolvedEntry | undefined

    for (const entry of this.entries) {
      if (!matchesMethod(entry.descriptor, method)) {
        continue
      }

      const match = matchPathPattern(entry.descriptor.path, path)

      if (!match) {
        continue
      }

      if (
        !bestMatch ||
        comparePathSpecificity(match.specificity, bestMatch.specificity) > 0
      ) {
        bestMatch = {
          descriptor: entry.descriptor,
          handler: entry.handler,
          params: match.params,
          specificity: match.specificity
        }
      }
    }

    return bestMatch
  }

  private async runWithMiddlewares(
    invocation: PathInvocation,
    handler: PathHandler
  ): Promise<unknown> {
    let lastIndex = -1

    const dispatch = async (index: number): Promise<unknown> => {
      if (index <= lastIndex) {
        throw new Error('Invocation middleware called next() multiple times')
      }

      lastIndex = index

      const middleware = this.invocationMiddlewares[index]

      if (!middleware) {
        return handler(createPathRequest(invocation), createInvocationContext(invocation))
      }

      return middleware(invocation, async () => dispatch(index + 1))
    }

    return dispatch(0)
  }
}

function createPathDescriptor(
  path: string,
  definition: StaticPathDefinition | ExposePathOptions
): PathDescriptor {
  assertPathPattern(path)

  if (isSkillPath(path)) {
    const options = typeof definition === 'string'
      ? {}
      : definition as ExposeSkillOptions
    const description = options.description ??
      (typeof definition === 'string' ? deriveMarkdownDescription(definition) : undefined)

    return {
      type: 'skill',
      path,
      ...(description ? { description } : {}),
      ...(options.contentType ? { contentType: options.contentType } : { contentType: 'text/markdown' })
    }
  }

  if (isPromptPath(path)) {
    const options = typeof definition === 'string'
      ? {}
      : definition as ExposePromptOptions
    const description = options.description ??
      (typeof definition === 'string' ? deriveMarkdownDescription(definition) : undefined)

    return {
      type: 'prompt',
      path,
      ...(description ? { description } : {}),
      ...(options.inputSchema ? { inputSchema: options.inputSchema } : {}),
      ...(options.outputSchema ? { outputSchema: options.outputSchema } : {})
    }
  }

  if (typeof definition === 'string' || !('method' in definition)) {
    throw new Error(`Endpoint path "${path}" requires a descriptor with a method`)
  }

  const options = definition as ExposeEndpointOptions

  return {
    type: 'endpoint',
    path,
    method: options.method,
    ...(options.description ? { description: options.description } : {}),
    ...(options.inputSchema ? { inputSchema: options.inputSchema } : {}),
    ...(options.outputSchema ? { outputSchema: options.outputSchema } : {}),
    ...(options.contentType ? { contentType: options.contentType } : {})
  }
}

function createPathHandler(
  path: string,
  descriptor: PathDescriptor,
  definition: StaticPathDefinition | ExposePathOptions,
  handler: PathHandler | undefined
): PathHandler {
  if (typeof definition === 'string') {
    if (descriptor.type === 'prompt') {
      return async () => ({
        messages: [
          {
            role: 'user',
            content: definition
          }
        ]
      })
    }

    if (descriptor.type === 'skill') {
      return async () => definition
    }

    throw new Error(`Endpoint path "${path}" requires a handler`)
  }

  if (!handler) {
    throw new Error(`Path "${path}" requires a handler`)
  }

  return handler
}

function createRegistrationKey(descriptor: PathDescriptor): string {
  return descriptor.type === 'endpoint'
    ? `${descriptor.method} ${descriptor.path}`
    : descriptor.path
}

function matchesMethod(
  descriptor: PathDescriptor,
  method: CallClientMessage['method']
): boolean {
  return descriptor.type === 'endpoint' ? descriptor.method === method : method === 'GET'
}

function assertPathPattern(path: string): void {
  if (!isPathPattern(path)) {
    throw new Error(
      `Invalid path "${path}". Expected a leading slash, lowercase segments, optional :params, and reserved leaf names skill.md or prompt.md.`
    )
  }
}

function createPathRequest(invocation: PathInvocation): PathRequest {
  return {
    params: invocation.params,
    queries: invocation.queries,
    ...(invocation.body !== undefined ? { body: invocation.body } : {}),
    headers: invocation.headers
  }
}

function createInvocationContext(
  invocation: PathInvocation
): PathInvocationContext {
  return {
    requestId: invocation.requestId,
    clientId: invocation.clientId,
    type: invocation.type,
    method: invocation.method,
    path: invocation.path,
    ...(invocation.auth ? { auth: invocation.auth } : {})
  }
}

function deriveMarkdownDescription(content: string): string | undefined {
  const lines = content.split(/\r?\n/).map((line) => line.trim())
  const paragraph: string[] = []

  for (const line of lines) {
    if (!line) {
      if (paragraph.length > 0) {
        break
      }

      continue
    }

    if (line.startsWith('#')) {
      continue
    }

    paragraph.push(line)
  }

  return paragraph.length > 0 ? paragraph.join(' ') : undefined
}

function asArgumentRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}
