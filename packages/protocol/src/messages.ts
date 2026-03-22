import type { SerializedError } from './errors.js'
import type { RpcArguments } from './json.js'
import type {
  AuthContext,
  CapabilityKind,
  ClientCapabilityUpdate,
  ClientDescriptor
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

export interface UpdateClientCapabilitiesMessage {
  type: 'updateClientCapabilities'
  clientId: string
  capabilities: ClientCapabilityUpdate
}

export interface CallClientMessage {
  type: 'callClient'
  requestId: string
  clientId: string
  kind: CapabilityKind
  name?: string
  uri?: string
  args?: RpcArguments
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
  | UpdateClientCapabilitiesMessage
  | UnregisterClientMessage
  | CallClientResultMessage
  | PingMessage
  | PongMessage

export type ServerToClientMessage = CallClientMessage | PingMessage | PongMessage

export type MdpMessage = ClientToServerMessage | ServerToClientMessage
