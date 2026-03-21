import {
  type AuthContext,
  type CallClientMessage,
  type ServerToClientMessage,
  createSerializedError
} from '@modeldriveprotocol/protocol'

import { HttpLoopClientTransport } from './http-loop-client.js'
import { ProcedureRegistry } from './procedure-registry.js'
import type {
  BrowserScriptClientAttributes,
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
import { WebSocketClientTransport } from './ws-client.js'

export class MdpClient {
  private readonly serverUrl: string
  private readonly serverProtocol: string
  private readonly usesDefaultTransport: boolean
  private clientInfo: ClientInfo
  private readonly registry = new ProcedureRegistry()
  private readonly transport: ClientTransport
  private readonly transportAuth: ClientTransportAuthOptions | undefined
  private auth: AuthContext | undefined
  private connected = false
  private registered = false

  constructor(options: MdpClientOptions) {
    this.serverUrl = options.serverUrl
    this.serverProtocol = new URL(options.serverUrl).protocol
    this.usesDefaultTransport = options.transport === undefined
    this.clientInfo = options.client
    this.auth = options.auth
    this.transportAuth = options.transportAuth
    this.transport = options.transport ?? createDefaultTransport(options.serverUrl)
    this.transport.onMessage((message) => {
      void this.handleMessage(message)
    })
    this.transport.onClose(() => {
      this.connected = false
      this.registered = false
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

  async connect(): Promise<void> {
    await this.authenticateTransport()
    await this.transport.connect()
    this.connected = true
  }

  setAuth(auth?: AuthContext): this {
    this.auth = auth
    return this
  }

  async authenticateTransport(auth: AuthContext | undefined = this.auth): Promise<void> {
    const effectiveTransportAuth = this.transportAuth ??
      (this.usesDefaultTransport &&
          auth &&
          isWebSocketProtocol(this.serverProtocol)
        ? ({
          mode: 'cookie'
        } satisfies ClientTransportAuthOptions)
        : undefined)

    if (!effectiveTransportAuth) {
      return
    }

    switch (effectiveTransportAuth.mode) {
      case 'cookie':
        await bootstrapCookieTransportAuth(
          this.serverUrl,
          effectiveTransportAuth,
          effectiveTransportAuth.auth ?? auth
        )
        return
    }
  }

  register(overrides: ClientDescriptorOverride = {}): void {
    this.ensureConnected()
    this.clientInfo = {
      ...this.clientInfo,
      ...overrides
    }

    this.transport.send({
      type: 'registerClient',
      client: this.registry.describe(this.clientInfo),
      ...(this.auth ? { auth: this.auth } : {})
    })
    this.registered = true
  }

  async disconnect(): Promise<void> {
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
}

export function createMdpClient(options: MdpClientOptions): MdpClient {
  return new MdpClient(options)
}

function createDefaultTransport(serverUrl: string): ClientTransport {
  const protocol = new URL(serverUrl).protocol

  switch (protocol) {
    case 'ws:':
    case 'wss:':
      return new WebSocketClientTransport(serverUrl)
    case 'http:':
    case 'https:':
      return new HttpLoopClientTransport(serverUrl)
    default:
      throw new Error(`Unsupported MDP transport protocol: ${protocol}`)
  }
}

function isWebSocketProtocol(protocol: string): boolean {
  return protocol === 'ws:' || protocol === 'wss:'
}

const DEFAULT_COOKIE_AUTH_ENDPOINT = '/mdp/auth'

async function bootstrapCookieTransportAuth(
  serverUrl: string,
  options: Extract<ClientTransportAuthOptions, { mode: 'cookie' }>,
  auth: AuthContext | undefined
): Promise<void> {
  if (!auth) {
    throw new Error('Cookie transport auth requires an auth context')
  }

  const fetchImpl = options.fetch ?? globalThis.fetch

  if (!fetchImpl) {
    throw new Error('No fetch implementation is available in this runtime')
  }

  const response = await fetchImpl(resolveTransportAuthEndpoint(serverUrl, options.endpoint), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify({
      auth
    }),
    credentials: options.credentials ?? 'include'
  })

  if (!response.ok) {
    throw new Error(`Unable to bootstrap websocket auth for ${serverUrl}`)
  }
}

function resolveTransportAuthEndpoint(serverUrl: string, endpoint?: string): string {
  const baseUrl = new URL(serverUrl)

  if (baseUrl.protocol === 'ws:') {
    baseUrl.protocol = 'http:'
  } else if (baseUrl.protocol === 'wss:') {
    baseUrl.protocol = 'https:'
  }

  return new URL(endpoint ?? DEFAULT_COOKIE_AUTH_ENDPOINT, baseUrl).toString()
}

export function resolveServerUrl(attributes: BrowserScriptClientAttributes): string {
  if (attributes.serverUrl) {
    return attributes.serverUrl
  }

  const protocol = attributes.serverProtocol ?? 'ws'
  const host = attributes.serverHost ?? '127.0.0.1'
  const port = attributes.serverPort ?? 7070

  return `${protocol}://${host}:${port}`
}
