import type {
  AuthContext,
  CapabilityKind,
  ClientDescriptor,
  ClientToServerMessage,
  JsonObject,
  JsonSchema,
  PromptArgumentDescriptor,
  RpcArguments,
  ServerToClientMessage
} from '@modeldriveprotocol/protocol'

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

export interface ClientInfo {
  id: string
  name: string
  description?: string
  version?: string
  platform?: string
  metadata?: JsonObject
}

export interface CapabilityInvocationContext {
  requestId: string
  clientId: string
  kind: CapabilityKind
  name?: string
  uri?: string
  auth?: AuthContext
}

export type CapabilityHandler<TResult = unknown> = (
  args: RpcArguments | undefined,
  context: CapabilityInvocationContext
) => TResult | Promise<TResult>

export interface CapabilityInvocation extends CapabilityInvocationContext {
  args: RpcArguments | undefined
}

export type CapabilityInvocationNext<TResult = unknown> = () => Promise<TResult>

export type CapabilityInvocationMiddleware<TResult = unknown> = (
  invocation: CapabilityInvocation,
  next: CapabilityInvocationNext<TResult>
) => TResult | Promise<TResult>

export type SkillQuery = Record<string, string>
export type SkillHeaders = Record<string, string>

export type SkillResolver<TResult = string> = (
  query: SkillQuery,
  headers: SkillHeaders,
  context: CapabilityInvocationContext
) => TResult | Promise<TResult>

export type SkillDefinition = string | SkillResolver | CapabilityHandler

export interface ExposeToolOptions {
  description?: string
  inputSchema?: JsonSchema
}

export interface ExposePromptOptions {
  description?: string
  arguments?: PromptArgumentDescriptor[]
}

export interface ExposeSkillOptions {
  description?: string
  contentType?: string
  inputSchema?: JsonSchema
}

export interface ExposeResourceOptions {
  name: string
  description?: string
  mimeType?: string
}

export interface ClientTransport {
  connect(): Promise<void>
  send(message: ClientToServerMessage): void
  close(code?: number, reason?: string): Promise<void>
  onMessage(handler: (message: ServerToClientMessage) => void): void
  onClose(handler: () => void): void
}

export interface CookieTransportAuthOptions {
  mode: 'cookie'
  endpoint?: string
  auth?: AuthContext
  headers?: Record<string, string>
  credentials?: RequestCredentials
  fetch?: FetchLike
}

export type ClientTransportAuthOptions = CookieTransportAuthOptions

export type MdpClientReconnectEvent =
  | {
    type: 'disconnected'
  }
  | {
    type: 'reconnectScheduled'
    attempt: number
    delayMs: number
    error?: Error
  }
  | {
    type: 'reconnectAttempt'
    attempt: number
  }
  | {
    type: 'reconnected'
    attempt: number
  }
  | {
    type: 'reconnectStopped'
    attempt: number
    error: Error
  }

export interface MdpClientReconnectOptions {
  enabled?: boolean
  initialDelayMs?: number
  maxDelayMs?: number
  multiplier?: number
  maxAttempts?: number
  onEvent?: (event: MdpClientReconnectEvent) => void
}

export interface MdpClientOptions {
  serverUrl: string
  client: ClientInfo
  auth?: AuthContext
  transportAuth?: ClientTransportAuthOptions
  reconnect?: boolean | MdpClientReconnectOptions
  transport?: ClientTransport
}

export interface BrowserScriptClientAttributes {
  serverUrl?: string
  serverHost?: string
  serverPort?: number
  serverProtocol?: 'ws' | 'wss' | 'http' | 'https'
  clientId?: string
  clientName?: string
  clientDescription?: string
}

export type ClientDescriptorOverride = Partial<
  Omit<ClientDescriptor, 'tools' | 'prompts' | 'skills' | 'resources'>
>
