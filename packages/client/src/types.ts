import type {
  AuthContext,
  ClientDescriptor,
  HttpMethod,
  JsonSchema,
  JsonValue,
  PathDescriptor,
  PathNodeKind,
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
  metadata?: Record<string, JsonValue>
}

export interface PathInvocationContext {
  requestId: string
  clientId: string
  type: PathNodeKind
  method: HttpMethod
  path: string
  auth?: AuthContext
}

export interface PathRequest {
  params: RpcArguments
  queries: RpcArguments
  body?: JsonValue
  headers: Record<string, string>
}

export interface PathInvocation extends PathInvocationContext, PathRequest {
}

export type PathHandler<TResult = unknown> = (
  request: PathRequest,
  context: PathInvocationContext
) => TResult | Promise<TResult>

export type PathInvocationNext<TResult = unknown> = () => Promise<TResult>

export type PathInvocationMiddleware<TResult = unknown> = (
  invocation: PathInvocation,
  next: PathInvocationNext<TResult>
) => TResult | Promise<TResult>

export interface ExposeEndpointOptions {
  method: HttpMethod
  description?: string
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
  contentType?: string
}

export interface ExposeSkillOptions {
  description?: string
  contentType?: string
}

export interface ExposePromptOptions {
  description?: string
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
}

export type ExposePathOptions =
  | ExposeEndpointOptions
  | ExposeSkillOptions
  | ExposePromptOptions

export type StaticPathDefinition = string

export interface ClientTransport {
  connect(): Promise<void>
  send(message: import('@modeldriveprotocol/protocol').ClientToServerMessage): void
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

export type ClientDescriptorOverride = Partial<Omit<ClientDescriptor, 'paths'>>

export type ExposedPath = PathDescriptor

export type CapabilityInvocationMiddleware<TResult = unknown> =
  PathInvocationMiddleware<TResult>
