import type { SerializedError } from './errors.js'
import type { JsonValue, RpcArguments } from './json.js'
import type {
  AuthContext,
  ClientDescriptor,
  HttpMethod,
  PathDescriptor
} from './models.js'

export interface RegisterClientMessage {
  type: 'registerClient'
  client: ClientDescriptor
  auth?: AuthContext
}

export interface UnregisterClientMessage {
  type: 'unregisterClient'
  clientId: string
}

export interface UpdateClientCatalogMessage {
  type: 'updateClientCatalog'
  clientId: string
  paths: PathDescriptor[]
}

export interface CallClientMessage {
  type: 'callClient'
  requestId: string
  clientId: string
  method: HttpMethod
  path: string
  params?: RpcArguments
  query?: RpcArguments
  body?: JsonValue
  headers?: Record<string, string>
  auth?: AuthContext
}

export interface CallClientResultMessage {
  type: 'callClientResult'
  requestId: string
  ok: boolean
  data?: unknown
  error?: SerializedError
}

export interface PingMessage {
  type: 'ping'
  timestamp: number
}

export interface PongMessage {
  type: 'pong'
  timestamp: number
}

export type ClientToServerMessage =
  | RegisterClientMessage
  | UpdateClientCatalogMessage
  | UnregisterClientMessage
  | CallClientResultMessage
  | PingMessage
  | PongMessage

export type ServerToClientMessage = CallClientMessage | PingMessage | PongMessage

export type MdpMessage = ClientToServerMessage | ServerToClientMessage
