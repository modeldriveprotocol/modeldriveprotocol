import {
  type AuthContext,
  type CallClientMessage,
  type ClientCapabilityUpdate,
  type ServerToClientMessage,
  createSerializedError
} from '@modeldriveprotocol/protocol'

import {
  createDefaultTransport,
  hasCapabilityUpdate,
  resolveServerUrl
} from './transport/client-connection.js'
import { ProcedureRegistry } from './runtime/procedure-registry.js'
import { MdpClientReconnectController } from './runtime/reconnect-controller.js'
import { authenticateTransport } from './transport/transport-auth.js'
import type {
  CapabilityHandler,
  ClientDescriptorOverride,
  ClientInfo,
  ClientTransport,
  ClientTransportAuthOptions,
  ExposePromptOptions,
  ExposeResourceOptions,
  ExposeSkillOptions,
  ExposeToolOptions,
  MdpClientOptions,
  SkillDefinition,
  SkillResolver
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

  exposeTool(
    name: string,
    handler: CapabilityHandler,
    options?: ExposeToolOptions
  ): this {
    this.registry.exposeTool(name, handler, options)
    return this
  }

  exposePrompt(
    name: string,
    handler: CapabilityHandler,
    options?: ExposePromptOptions
  ): this {
    this.registry.exposePrompt(name, handler, options)
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
    options?: ExposeSkillOptions
  ): this {
    if (typeof definition === 'string') {
      this.registry.exposeSkill(name, definition, options)
      return this
    }

    if (options?.inputSchema === undefined) {
      this.registry.exposeSkill(name, definition as SkillResolver, options)
      return this
    }

    this.registry.exposeSkill(name, definition as CapabilityHandler, options)
    return this
  }

  exposeResource(
    uri: string,
    handler: CapabilityHandler,
    options: ExposeResourceOptions
  ): this {
    this.registry.exposeResource(uri, handler, options)
    return this
  }

  removeTool(name: string): this {
    this.registry.removeTool(name)
    return this
  }

  removePrompt(name: string): this {
    this.registry.removePrompt(name)
    return this
  }

  removeSkill(name: string): this {
    this.registry.removeSkill(name)
    return this
  }

  removeResource(uri: string): this {
    this.registry.removeResource(uri)
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

  syncCapabilities(
    capabilities: ClientCapabilityUpdate = this.registry.describeCapabilities()
  ): void {
    this.ensureRegistered()

    if (!hasCapabilityUpdate(capabilities)) {
      throw new Error('Capability sync requires at least one capability group')
    }

    this.transport.send({
      type: 'updateClientCapabilities',
      clientId: this.clientInfo.id,
      capabilities
    })
  }

  syncTools(): void {
    this.syncCapabilities({
      tools: this.registry.describeTools()
    })
  }

  syncPrompts(): void {
    this.syncCapabilities({
      prompts: this.registry.describePrompts()
    })
  }

  syncSkills(): void {
    this.syncCapabilities({
      skills: this.registry.describeSkills()
    })
  }

  syncResources(): void {
    this.syncCapabilities({
      resources: this.registry.describeResources()
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
