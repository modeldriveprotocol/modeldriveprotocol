import {
  type AuthContext,
  type CallClientMessage,
  type HttpMethod,
  type PathDescriptor,
  type ServerToClientMessage,
  createSerializedError
} from '@modeldriveprotocol/protocol'

import { createDefaultTransport, resolveServerUrl } from './transport/client-connection.js'
import { ProcedureRegistry } from './runtime/procedure-registry.js'
import {
  createLegacyPromptPath,
  createLegacyResourcePath,
  createLegacySkillPath,
  createLegacyToolPath
} from './runtime/legacy-capability-paths.js'
import { MdpClientReconnectController } from './runtime/reconnect-controller.js'
import { authenticateTransport } from './transport/transport-auth.js'
import type {
  ClientDescriptorOverride,
  ClientInfo,
  ClientTransport,
  ClientTransportAuthOptions,
  ExposeLegacyPromptOptions,
  ExposePathOptions,
  ExposeResourceOptions,
  ExposeToolOptions,
  ExposeLegacySkillOptions,
  LegacyPromptHandler,
  LegacyResourceHandler,
  LegacySkillHandler,
  LegacyToolHandler,
  LegacyCapabilityContext,
  MdpClientOptions,
  PathHandler,
  PathInvocationContext,
  PathRequest,
  PathInvocationMiddleware,
  StaticPathDefinition
} from './types.js'

export class MdpClient {
  private readonly serverUrl: string
  private readonly serverProtocol: string
  private readonly usesDefaultTransport: boolean
  private clientInfo: ClientInfo
  private readonly registry = new ProcedureRegistry()
  private readonly transport: ClientTransport
  private readonly transportAuth: ClientTransportAuthOptions | undefined
  private readonly reconnectController: MdpClientReconnectController
  private auth: AuthContext | undefined
  private connected = false
  private registered = false
  private restoreRegistrationOnReconnect = false

  constructor(options: MdpClientOptions) {
    this.serverUrl = options.serverUrl
    this.serverProtocol = new URL(options.serverUrl).protocol
    this.usesDefaultTransport = options.transport === undefined
    this.clientInfo = options.client
    this.auth = options.auth
    this.transportAuth = options.transportAuth
    this.transport = options.transport ?? createDefaultTransport(options.serverUrl)
    this.reconnectController = new MdpClientReconnectController({
      serverUrl: this.serverUrl,
      reconnect: options.reconnect,
      reconnectTransport: async () => {
        await this.openTransport()

        if (this.reconnectController.isDisconnectRequested()) {
          await this.transport.close()
          return
        }

        if (this.restoreRegistrationOnReconnect) {
          this.sendRegisterMessage()
          this.registered = true
        }
      }
    })
    this.transport.onMessage((message) => {
      void this.handleMessage(message)
    })
    this.transport.onClose(() => {
      void this.handleTransportClose()
    })
  }

  useInvocationMiddleware(middleware: PathInvocationMiddleware): this {
    this.registry.useInvocationMiddleware(middleware)
    return this
  }

  removeInvocationMiddleware(middleware: PathInvocationMiddleware): this {
    this.registry.removeInvocationMiddleware(middleware)
    return this
  }

  expose(
    path: string,
    definition: StaticPathDefinition | ExposePathOptions,
    handler?: PathHandler
  ): this {
    this.registry.expose(path, definition, handler)
    return this
  }

  exposeTool(
    name: string,
    handler: LegacyToolHandler,
    options: ExposeToolOptions = {}
  ): this {
    return this.expose(
      createLegacyToolPath(name),
      {
        method: 'POST',
        ...(options.description ? { description: options.description } : {}),
        ...(options.inputSchema ? { inputSchema: options.inputSchema } : {}),
        ...(options.outputSchema ? { outputSchema: options.outputSchema } : {}),
        ...(options.contentType ? { contentType: options.contentType } : {}),
        legacy: {
          kind: 'tool',
          name
        }
      },
      async (request, context) => handler(readLegacyArgs(request), toLegacyContext(request, context))
    )
  }

  exposePrompt(
    name: string,
    definition: string | LegacyPromptHandler,
    options: ExposeLegacyPromptOptions = {}
  ): this {
    const path = createLegacyPromptPath(name)

    if (typeof definition === 'string') {
      return this.expose(path, {
        ...(options.description ? { description: options.description } : {}),
        ...(options.inputSchema ? { inputSchema: options.inputSchema } : {}),
        ...(options.outputSchema ? { outputSchema: options.outputSchema } : {}),
        legacy: {
          kind: 'prompt',
          name
        }
      }, async () => ({
        messages: [
          {
            role: 'user',
            content: definition
          }
        ]
      }))
    }

    return this.expose(
      path,
      {
        ...(options.description ? { description: options.description } : {}),
        ...(options.inputSchema ? { inputSchema: options.inputSchema } : {}),
        ...(options.outputSchema ? { outputSchema: options.outputSchema } : {}),
        legacy: {
          kind: 'prompt',
          name
        }
      },
      async (request, context) => definition(
        readLegacyArgs(request),
        toLegacyContext(request, context)
      )
    )
  }

  exposeSkill(
    name: string,
    definition: string | LegacySkillHandler | (() => unknown | Promise<unknown>),
    options: ExposeLegacySkillOptions = {}
  ): this {
    const path = createLegacySkillPath(name)

    if (typeof definition === 'string') {
      return this.expose(path, {
        ...(options.description ? { description: options.description } : {}),
        ...(options.contentType ? { contentType: options.contentType } : {}),
        legacy: {
          kind: 'skill',
          name
        }
      }, async () => definition)
    }

    return this.expose(
      path,
      {
        ...(options.description ? { description: options.description } : {}),
        ...(options.contentType ? { contentType: options.contentType } : {}),
        legacy: {
          kind: 'skill',
          name
        }
      },
      async (request, context) => {
        const legacyContext = toLegacyContext(request, context)

        return definition.length <= 0
          ? (definition as () => unknown | Promise<unknown>)()
          : (definition as LegacySkillHandler)(
              request.queries,
              request.headers,
              legacyContext
            )
      }
    )
  }

  exposeResource(
    uri: string,
    handler: LegacyResourceHandler,
    options: ExposeResourceOptions = {}
  ): this {
    return this.expose(
      createLegacyResourcePath(uri),
      {
        method: 'GET',
        ...(options.description ? { description: options.description } : {}),
        ...(options.mimeType ? { contentType: options.mimeType } : {}),
        legacy: {
          kind: 'resource',
          uri,
          ...(options.name ? { name: options.name } : {})
        }
      },
      async (request, context) => handler(toLegacyContext(request, context))
    )
  }

  unexpose(path: string, method?: HttpMethod): this {
    this.registry.unexpose(path, method)
    return this
  }

  async connect(): Promise<void> {
    this.reconnectController.beginConnect()
    await this.reconnectController.connect()
  }

  setAuth(auth?: AuthContext): this {
    this.auth = auth
    return this
  }

  async authenticateTransport(auth: AuthContext | undefined = this.auth): Promise<void> {
    await authenticateTransport({
      serverUrl: this.serverUrl,
      serverProtocol: this.serverProtocol,
      usesDefaultTransport: this.usesDefaultTransport,
      transportAuth: this.transportAuth,
      auth
    })
  }

  register(overrides: ClientDescriptorOverride = {}): void {
    this.ensureConnected()
    this.clientInfo = {
      ...this.clientInfo,
      ...overrides
    }

    this.sendRegisterMessage()
    this.registered = true
  }

  async disconnect(): Promise<void> {
    this.restoreRegistrationOnReconnect = false
    this.reconnectController.beginDisconnect()

    if (this.connected && this.registered) {
      this.transport.send({
        type: 'unregisterClient',
        clientId: this.clientInfo.id
      })
    }

    await this.transport.close()
    this.connected = false
    this.registered = false
  }

  describe() {
    return this.registry.describe(this.clientInfo)
  }

  syncCatalog(paths: PathDescriptor[] = this.registry.describePaths()): void {
    this.ensureRegistered()

    this.transport.send({
      type: 'updateClientCatalog',
      clientId: this.clientInfo.id,
      paths
    })
  }

  private async handleMessage(message: ServerToClientMessage): Promise<void> {
    switch (message.type) {
      case 'ping':
        this.transport.send({
          type: 'pong',
          timestamp: message.timestamp
        })
        return
      case 'callClient':
        await this.handleInvocation(message)
        return
      default:
        return
    }
  }

  private async handleInvocation(message: CallClientMessage): Promise<void> {
    try {
      const data = await this.registry.invoke(message)

      this.transport.send({
        type: 'callClientResult',
        requestId: message.requestId,
        ok: true,
        data
      })
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))

      this.transport.send({
        type: 'callClientResult',
        requestId: message.requestId,
        ok: false,
        error: createSerializedError('handler_error', normalized.message)
      })
    }
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('MDP client is not connected')
    }
  }

  private ensureRegistered(): void {
    this.ensureConnected()

    if (!this.registered) {
      throw new Error('MDP client is not registered')
    }
  }

  private async openTransport(): Promise<void> {
    await this.authenticateTransport()
    await this.transport.connect()
    this.connected = true
  }

  private sendRegisterMessage(): void {
    this.transport.send({
      type: 'registerClient',
      client: this.registry.describe(this.clientInfo),
      ...(this.auth ? { auth: this.auth } : {})
    })
  }

  private async handleTransportClose(): Promise<void> {
    const wasConnected = this.connected
    const wasRegistered = this.registered

    this.connected = false
    this.registered = false

    if (!wasConnected) {
      return
    }

    this.restoreRegistrationOnReconnect ||= wasRegistered
    this.reconnectController.handleUnexpectedClose()
  }
}

export function createMdpClient(options: MdpClientOptions): MdpClient {
  return new MdpClient(options)
}

export { resolveServerUrl } from './transport/client-connection.js'

function readLegacyArgs(request: PathRequest) {
  if (request.body !== undefined) {
    if (isArgumentRecord(request.body)) {
      return request.body
    }

    throw new Error('Legacy capability arguments must be a JSON object')
  }

  return request.queries
}

function toLegacyContext(
  request: PathRequest,
  context: PathInvocationContext
): LegacyCapabilityContext {
  return {
    ...context,
    params: request.params,
    queries: request.queries,
    headers: request.headers
  }
}

function isArgumentRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
