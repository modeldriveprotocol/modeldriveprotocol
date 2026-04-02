import { protocolErrorCodes } from './errors.js'
import { isJsonObject, isJsonValue } from './json.js'
import type { ClusterMessage } from './cluster-messages.js'
import type { MdpMessage } from './messages.js'
import {
  clientAuthSources,
  clientConnectionModes,
  httpMethods,
  legacyCapabilityKinds,
  pathNodeKinds
} from './models.js'
import type {
  AuthContext,
  ClientAuthSource,
  ClientConnectionMode,
  ClientDescriptor,
  HttpMethod,
  LegacyCapabilityAlias,
  LegacyCapabilityKind,
  PathDescriptor,
  PathNodeKind
} from './models.js'
import {
  isConcretePath,
  isPathPattern,
  isPromptPath,
  isSkillPath
} from './path-utils.js'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function hasString(value: unknown, key: string): boolean {
  return isJsonObject(value) && typeof value[key] === 'string'
}

function isPathNodeKind(value: unknown): value is PathNodeKind {
  return typeof value === 'string' && pathNodeKinds.includes(value as PathNodeKind)
}

export function isHttpMethod(value: unknown): value is HttpMethod {
  return typeof value === 'string' && httpMethods.includes(value as HttpMethod)
}

function isClientConnectionMode(value: unknown): value is ClientConnectionMode {
  return typeof value === 'string' && clientConnectionModes.includes(value as ClientConnectionMode)
}

function isClientAuthSource(value: unknown): value is ClientAuthSource {
  return typeof value === 'string' && clientAuthSources.includes(value as ClientAuthSource)
}

function isLegacyCapabilityKind(value: unknown): value is LegacyCapabilityKind {
  return (
    typeof value === 'string' &&
    legacyCapabilityKinds.includes(value as LegacyCapabilityKind)
  )
}

function isAuthContext(value: unknown): value is AuthContext {
  if (!isJsonObject(value)) {
    return false
  }

  return (
    (!('scheme' in value) || typeof value.scheme === 'string') &&
    (!('token' in value) || typeof value.token === 'string') &&
    (!('headers' in value) || isStringRecord(value.headers)) &&
    (!('metadata' in value) || isJsonObject(value.metadata))
  )
}

function isClientConnectionDescriptor(value: unknown): boolean {
  return (
    isJsonObject(value) &&
    isClientConnectionMode(value.mode) &&
    typeof value.secure === 'boolean' &&
    isClientAuthSource(value.authSource)
  )
}

function isLegacyCapabilityAlias(value: unknown): value is LegacyCapabilityAlias {
  if (!isJsonObject(value) || !isLegacyCapabilityKind(value.kind)) {
    return false
  }

  switch (value.kind) {
    case 'resource':
      return (
        typeof value.uri === 'string' &&
        (!('name' in value) || value.name === undefined || typeof value.name === 'string')
      )
    case 'tool':
    case 'prompt':
    case 'skill':
      return typeof value.name === 'string'
  }
}

function isPathDescriptor(value: unknown): value is PathDescriptor {
  if (!isJsonObject(value) || !isPathNodeKind(value.type) || !isPathPattern(value.path)) {
    return false
  }

  if ('description' in value && value.description !== undefined && typeof value.description !== 'string') {
    return false
  }

  if ('legacy' in value && value.legacy !== undefined && !isLegacyCapabilityAlias(value.legacy)) {
    return false
  }

  const legacy = isLegacyCapabilityAlias(value.legacy) ? value.legacy : undefined

  switch (value.type) {
    case 'endpoint':
      return (
        !isSkillPath(value.path) &&
        !isPromptPath(value.path) &&
        isHttpMethod(value.method) &&
        (!legacy || legacy.kind === 'tool' || legacy.kind === 'resource') &&
        (!('inputSchema' in value) || isJsonObject(value.inputSchema)) &&
        (!('outputSchema' in value) || isJsonObject(value.outputSchema)) &&
        (!('contentType' in value) || typeof value.contentType === 'string')
      )
    case 'skill':
      return (
        isSkillPath(value.path) &&
        (!legacy || legacy.kind === 'skill') &&
        (!('contentType' in value) || typeof value.contentType === 'string')
      )
    case 'prompt':
      return (
        isPromptPath(value.path) &&
        (!legacy || legacy.kind === 'prompt') &&
        (!('inputSchema' in value) || isJsonObject(value.inputSchema)) &&
        (!('outputSchema' in value) || isJsonObject(value.outputSchema))
      )
  }
}

function hasPathDescriptorArray(
  value: unknown,
  key: 'paths',
  required: boolean
): boolean {
  if (!isJsonObject(value)) {
    return false
  }

  if (!(key in value)) {
    return !required
  }

  const entry = value[key]

  return Array.isArray(entry) && entry.every(isPathDescriptor)
}

function hasClientCatalog(value: unknown, required: boolean): boolean {
  return hasPathDescriptorArray(value, 'paths', required)
}

export function isClientDescriptor(value: unknown): value is ClientDescriptor {
  if (!hasString(value, 'id') || !hasString(value, 'name')) {
    return false
  }

  return hasClientCatalog(value, true)
}

export function isListedClient(value: unknown): boolean {
  return (
    isClientDescriptor(value) &&
    isJsonObject(value) &&
    value.status === 'online' &&
    typeof value.connectedAt === 'string' &&
    typeof value.lastSeenAt === 'string' &&
    isClientConnectionDescriptor(value.connection)
  )
}

export function isProtocolErrorCode(value: unknown): value is (typeof protocolErrorCodes)[number] {
  return typeof value === 'string' && protocolErrorCodes.includes(value as (typeof protocolErrorCodes)[number])
}

export function isMdpMessage(value: unknown): value is MdpMessage {
  if (!isJsonObject(value) || typeof value.type !== 'string') {
    return false
  }

  const object = value
  const type = object.type

  switch (type) {
    case 'registerClient':
      return (
        isJsonObject(value) &&
        isClientDescriptor(value.client) &&
        (!('auth' in value) || isAuthContext(value.auth))
      )
    case 'unregisterClient':
      return hasString(value, 'clientId')
    case 'updateClientCatalog':
      return hasString(value, 'clientId') && hasPathDescriptorArray(value, 'paths', true)
    case 'callClient':
      return (
        hasString(object, 'requestId') &&
        hasString(object, 'clientId') &&
        isHttpMethod(object.method) &&
        hasString(object, 'path') &&
        isConcretePath(object.path) &&
        (!('params' in object) || isJsonObject(object.params)) &&
        (!('query' in object) || isJsonObject(object.query)) &&
        (!('body' in object) || isJsonValue(object.body)) &&
        (!('headers' in object) || isStringRecord(object.headers)) &&
        (!('auth' in object) || isAuthContext(object.auth))
      )
    case 'callClientResult':
      return (
        hasString(object, 'requestId') &&
        isJsonObject(object) &&
        typeof object.ok === 'boolean' &&
        (!('error' in object) ||
          (isJsonObject(object.error) &&
            isProtocolErrorCode(object.error.code) &&
            typeof object.error.message === 'string'))
      )
    case 'ping':
    case 'pong':
      return isJsonObject(object) && typeof object.timestamp === 'number'
    default:
      return false
  }
}

export function parseMessage(raw: string): MdpMessage {
  const parsed = JSON.parse(raw) as unknown

  if (!isMdpMessage(parsed)) {
    throw new Error('Invalid MDP message')
  }

  return parsed
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  return isJsonObject(value) && isStringArray(Object.values(value))
}

export function parseClusterMessage(raw: string): ClusterMessage {
  const parsed = JSON.parse(raw) as unknown

  if (!isClusterMessage(parsed)) {
    throw new Error('Invalid MDP cluster message')
  }

  return parsed
}

export function isClusterMessage(value: unknown): value is ClusterMessage {
  if (!isJsonObject(value) || typeof value.type !== 'string') {
    return false
  }

  const object = value

  switch (object.type) {
    case 'clusterHello':
      return (
        hasString(object, 'clusterId') &&
        (object.membershipMode === 'dynamic' || object.membershipMode === 'static') &&
        hasString(object, 'membershipFingerprint') &&
        hasString(object, 'serverId') &&
        typeof object.term === 'number' &&
        Number.isInteger(object.term) &&
        object.term >= 0 &&
        (
          object.role === 'leader' ||
          object.role === 'follower' ||
          object.role === 'candidate'
        ) &&
        hasString(object, 'wsUrl') &&
        hasString(object, 'clusterUrl') &&
        typeof object.timestamp === 'number' &&
        (!('leaderId' in object) || typeof object.leaderId === 'string') &&
        (!('leaderUrl' in object) || typeof object.leaderUrl === 'string')
      )
    case 'clusterHeartbeat':
      return (
        hasString(object, 'clusterId') &&
        hasString(object, 'serverId') &&
        typeof object.term === 'number' &&
        Number.isInteger(object.term) &&
        object.term >= 0 &&
        hasString(object, 'leaderId') &&
        hasString(object, 'leaderUrl') &&
        typeof object.leaseDurationMs === 'number' &&
        Number.isInteger(object.leaseDurationMs) &&
        object.leaseDurationMs > 0 &&
        typeof object.timestamp === 'number'
      )
    case 'clusterHeartbeatAck':
      return (
        hasString(object, 'clusterId') &&
        hasString(object, 'serverId') &&
        typeof object.term === 'number' &&
        Number.isInteger(object.term) &&
        object.term >= 0 &&
        hasString(object, 'followerId') &&
        hasString(object, 'leaderId') &&
        typeof object.timestamp === 'number'
      )
    case 'clusterVoteRequest':
      return (
        hasString(object, 'clusterId') &&
        hasString(object, 'serverId') &&
        typeof object.term === 'number' &&
        Number.isInteger(object.term) &&
        object.term >= 0 &&
        hasString(object, 'candidateId') &&
        hasString(object, 'candidateUrl') &&
        typeof object.timestamp === 'number'
      )
    case 'clusterVoteResponse':
      return (
        hasString(object, 'clusterId') &&
        hasString(object, 'serverId') &&
        typeof object.term === 'number' &&
        Number.isInteger(object.term) &&
        object.term >= 0 &&
        hasString(object, 'voterId') &&
        typeof object.voteGranted === 'boolean' &&
        typeof object.timestamp === 'number' &&
        (!('leaderId' in object) || typeof object.leaderId === 'string') &&
        (!('leaderUrl' in object) || typeof object.leaderUrl === 'string')
      )
    case 'clusterLeaderResign':
      return (
        hasString(object, 'clusterId') &&
        hasString(object, 'serverId') &&
        typeof object.term === 'number' &&
        Number.isInteger(object.term) &&
        object.term >= 0 &&
        hasString(object, 'leaderId') &&
        typeof object.timestamp === 'number'
      )
    case 'clusterRpcRequest':
      return (
        hasString(object, 'clusterId') &&
        hasString(object, 'serverId') &&
        typeof object.term === 'number' &&
        Number.isInteger(object.term) &&
        object.term >= 0 &&
        hasString(object, 'requestId') &&
        hasString(object, 'method') &&
        typeof object.timestamp === 'number' &&
        (!('params' in object) || isJsonValue(object.params))
      )
    case 'clusterRpcResponse':
      return (
        hasString(object, 'clusterId') &&
        hasString(object, 'serverId') &&
        typeof object.term === 'number' &&
        Number.isInteger(object.term) &&
        object.term >= 0 &&
        hasString(object, 'requestId') &&
        typeof object.ok === 'boolean' &&
        typeof object.timestamp === 'number' &&
        (!('result' in object) || isJsonValue(object.result)) &&
        (!('error' in object) || isJsonValue(object.error))
      )
    default:
      return false
  }
}
