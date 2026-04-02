import type { JsonObject, JsonSchema } from './json.js'

export const pathNodeKinds = ['endpoint', 'skill', 'prompt'] as const
export const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export const clientConnectionModes = ['ws', 'http-loop'] as const
export const clientAuthSources = [
  'none',
  'message',
  'transport',
  'transport+message'
] as const

export type PathNodeKind = (typeof pathNodeKinds)[number]
export type HttpMethod = (typeof httpMethods)[number]
export type ClientConnectionMode = (typeof clientConnectionModes)[number]
export type ClientAuthSource = (typeof clientAuthSources)[number]

export interface AuthContext {
  scheme?: string
  token?: string
  headers?: Record<string, string>
  metadata?: JsonObject
}

export interface ClientConnectionDescriptor {
  mode: ClientConnectionMode
  secure: boolean
  authSource: ClientAuthSource
}

interface BasePathDescriptor {
  path: string
  description?: string
}

export interface EndpointPathDescriptor extends BasePathDescriptor {
  type: 'endpoint'
  method: HttpMethod
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
  contentType?: string
}

export interface SkillPathDescriptor extends BasePathDescriptor {
  type: 'skill'
  contentType?: string
}

export interface PromptPathDescriptor extends BasePathDescriptor {
  type: 'prompt'
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
}

export type PathDescriptor =
  | EndpointPathDescriptor
  | SkillPathDescriptor
  | PromptPathDescriptor

export interface ClientCatalog {
  paths: PathDescriptor[]
}

export interface ClientDescriptor extends ClientCatalog {
  id: string
  name: string
  description?: string
  version?: string
  platform?: string
  metadata?: JsonObject
}

export interface ListedClient extends ClientDescriptor {
  status: 'online'
  connectedAt: string
  lastSeenAt: string
  connection: ClientConnectionDescriptor
}

export type IndexedPathDescriptor = PathDescriptor & {
  clientId: string
  clientName: string
}
