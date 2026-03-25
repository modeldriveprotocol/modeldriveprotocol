import type {
  CallClientMessage,
  ClientCapabilities,
  ClientDescriptor,
  PromptDescriptor,
  ResourceDescriptor,
  SkillDescriptor,
  ToolDescriptor
} from '@modeldriveprotocol/protocol'
import { isSkillPath } from '@modeldriveprotocol/protocol'

import type {
  CapabilityInvocation,
  CapabilityInvocationContext,
  CapabilityHandler,
  CapabilityInvocationMiddleware,
  ClientInfo,
  ExposePromptOptions,
  ExposeResourceOptions,
  ExposeSkillOptions,
  ExposeToolOptions,
  SkillDefinition,
  SkillHeaders,
  SkillQuery,
  SkillResolver
} from '../types.js'

interface ProcedureEntry<TDescriptor> {
  descriptor: TDescriptor
  handler: CapabilityHandler
}

export class ProcedureRegistry {
  private readonly tools = new Map<string, ProcedureEntry<ToolDescriptor>>()
  private readonly prompts = new Map<string, ProcedureEntry<PromptDescriptor>>()
  private readonly skills = new Map<string, ProcedureEntry<SkillDescriptor>>()
  private readonly resources = new Map<string, ProcedureEntry<ResourceDescriptor>>()
  private readonly invocationMiddlewares: CapabilityInvocationMiddleware[] = []

  useInvocationMiddleware(middleware: CapabilityInvocationMiddleware): this {
    this.invocationMiddlewares.push(middleware)
    return this
  }

  removeInvocationMiddleware(middleware: CapabilityInvocationMiddleware): boolean {
    const index = this.invocationMiddlewares.indexOf(middleware)

    if (index < 0) {
      return false
    }

    this.invocationMiddlewares.splice(index, 1)
    return true
  }

  exposeTool(
    name: string,
    handler: CapabilityHandler,
    options: ExposeToolOptions = {}
  ): this {
    this.tools.set(name, {
      descriptor: {
        name,
        ...(options.description ? { description: options.description } : {}),
        ...(options.inputSchema ? { inputSchema: options.inputSchema } : {})
      },
      handler
    })

    return this
  }

  exposePrompt(
    name: string,
    handler: CapabilityHandler,
    options: ExposePromptOptions = {}
  ): this {
    this.prompts.set(name, {
      descriptor: {
        name,
        ...(options.description ? { description: options.description } : {}),
        ...(options.arguments ? { arguments: options.arguments } : {})
      },
      handler
    })

    return this
  }

  exposeSkill(name: string, content: string, options?: ExposeSkillOptions): this
  exposeSkill(
    name: string,
    handler: CapabilityHandler,
    options?: ExposeSkillOptions
  ): this
  exposeSkill(
    name: string,
    resolver: SkillResolver,
    options?: ExposeSkillOptions
  ): this
  exposeSkill(
    name: string,
    definition: SkillDefinition,
    options: ExposeSkillOptions = {}
  ): this {
    assertSkillPath(name)

    const isStaticSkill = typeof definition === 'string'
    const isResolverSkill = typeof definition === 'function' && options.inputSchema === undefined
    const description = options.description ??
      (isStaticSkill
        ? deriveSkillDescription(definition)
        : undefined)
    const contentType = options.contentType ??
      (isStaticSkill || isResolverSkill ? 'text/markdown' : undefined)

    this.skills.set(name, {
      descriptor: {
        name,
        ...(description ? { description } : {}),
        ...(contentType ? { contentType } : {}),
        ...(options.inputSchema ? { inputSchema: options.inputSchema } : {})
      },
      handler: toSkillHandler(definition)
    })

    return this
  }

  exposeResource(
    uri: string,
    handler: CapabilityHandler,
    options: ExposeResourceOptions
  ): this {
    this.resources.set(uri, {
      descriptor: {
        uri,
        name: options.name,
        ...(options.description ? { description: options.description } : {}),
        ...(options.mimeType ? { mimeType: options.mimeType } : {})
      },
      handler
    })

    return this
  }

  removeTool(name: string): boolean {
    return this.tools.delete(name)
  }

  removePrompt(name: string): boolean {
    return this.prompts.delete(name)
  }

  removeSkill(name: string): boolean {
    return this.skills.delete(name)
  }

  removeResource(uri: string): boolean {
    return this.resources.delete(uri)
  }

  describe(client: ClientInfo): ClientDescriptor {
    return {
      ...client,
      ...this.describeCapabilities()
    }
  }

  describeCapabilities(): ClientCapabilities {
    return {
      tools: this.describeTools(),
      prompts: this.describePrompts(),
      skills: this.describeSkills(),
      resources: this.describeResources()
    }
  }

  describeTools(): ToolDescriptor[] {
    return [...this.tools.values()].map(({ descriptor }) => descriptor)
  }

  describePrompts(): PromptDescriptor[] {
    return [...this.prompts.values()].map(({ descriptor }) => descriptor)
  }

  describeSkills(): SkillDescriptor[] {
    return [...this.skills.values()].map(({ descriptor }) => descriptor)
  }

  describeResources(): ResourceDescriptor[] {
    return [...this.resources.values()].map(({ descriptor }) => descriptor)
  }

  invoke(
    message: Pick<
      CallClientMessage,
      'requestId' | 'clientId' | 'kind' | 'name' | 'uri' | 'args' | 'auth'
    >
  ): Promise<unknown> {
    switch (message.kind) {
      case 'tool':
        return this.run(this.tools, message.name, 'tool', message)
      case 'prompt':
        return this.run(this.prompts, message.name, 'prompt', message)
      case 'skill':
        return this.run(this.skills, message.name, 'skill', message)
      case 'resource':
        return this.run(this.resources, message.uri, 'resource', message)
    }
  }

  private async run<TDescriptor>(
    entries: Map<string, ProcedureEntry<TDescriptor>>,
    key: string | undefined,
    kind: string,
    message: Pick<
      CallClientMessage,
      'requestId' | 'clientId' | 'kind' | 'name' | 'uri' | 'args' | 'auth'
    >
  ): Promise<unknown> {
    if (!key) {
      throw new Error(`Missing ${kind} key`)
    }

    const entry = entries.get(key)

    if (!entry) {
      throw new Error(`Unknown ${kind} "${key}"`)
    }

    const invocation: CapabilityInvocation = {
      requestId: message.requestId,
      clientId: message.clientId,
      args: message.args,
      kind: message.kind,
      ...(message.name ? { name: message.name } : {}),
      ...(message.uri ? { uri: message.uri } : {}),
      ...(message.auth ? { auth: message.auth } : {})
    }

    return this.runWithMiddlewares(invocation, entry.handler)
  }

  private async runWithMiddlewares(
    invocation: CapabilityInvocation,
    handler: CapabilityHandler
  ): Promise<unknown> {
    let lastIndex = -1

    const dispatch = async (index: number): Promise<unknown> => {
      if (index <= lastIndex) {
        throw new Error('Invocation middleware called next() multiple times')
      }

      lastIndex = index

      const middleware = this.invocationMiddlewares[index]

      if (!middleware) {
        return handler(invocation.args, createInvocationContext(invocation))
      }

      return middleware(invocation, async () => dispatch(index + 1))
    }

    return dispatch(0)
  }
}

function toSkillHandler(definition: SkillDefinition): CapabilityHandler {
  if (typeof definition === 'string') {
    return async () => definition
  }

  return async (args, context) => {
    if (isSkillResolverDefinition(definition, args)) {
      const { query, headers } = readSkillRequest(args)
      return (definition as SkillResolver)(query, headers, context)
    }

    return (definition as CapabilityHandler)(args, context)
  }
}

function deriveSkillDescription(content: string): string | undefined {
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

function assertSkillPath(name: string): void {
  if (!isSkillPath(name)) {
    throw new Error(
      `Invalid skill path "${name}". Expected slash-separated lowercase segments using only a-z, 0-9, "-" and "_".`
    )
  }
}

function isSkillResolverDefinition(
  definition: Exclude<SkillDefinition, string>,
  args: unknown
): boolean {
  if (definition.length >= 3) {
    return true
  }

  if (definition.length <= 1) {
    return false
  }

  return !isPlainObject(args) || 'query' in args || 'headers' in args
}

function readSkillRequest(
  args: unknown
): {
  query: SkillQuery
  headers: SkillHeaders
} {
  if (!isPlainObject(args)) {
    return {
      query: {},
      headers: {}
    }
  }

  return {
    query: readSkillValueRecord(args.query),
    headers: readSkillValueRecord(args.headers)
  }
}

function readSkillValueRecord(value: unknown): SkillQuery {
  if (!isPlainObject(value)) {
    return {}
  }

  const result: SkillQuery = {}

  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean'
    ) {
      result[key] = entry
    }
  }

  return result
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createInvocationContext(
  invocation: CapabilityInvocation
): CapabilityInvocationContext {
  return {
    requestId: invocation.requestId,
    clientId: invocation.clientId,
    kind: invocation.kind,
    ...(invocation.name ? { name: invocation.name } : {}),
    ...(invocation.uri ? { uri: invocation.uri } : {}),
    ...(invocation.auth ? { auth: invocation.auth } : {})
  }
}
