import { protocolErrorCodes } from './errors.js'
import { isJsonObject } from './json.js'
import type { MdpMessage } from './messages.js'
import { capabilityKinds, clientAuthSources, clientConnectionModes } from './models.js'
import type {
  AuthContext,
  CapabilityKind,
  ClientAuthSource,
  ClientCapabilityUpdate,
  ClientConnectionMode,
  ClientDescriptor,
  ResourceDescriptor,
  SkillDescriptor
} from './models.js'

const SKILL_PATH_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*)(?:\/[a-z0-9](?:[a-z0-9_-]*))*$/

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function hasString(value: unknown, key: string): boolean {
  return isJsonObject(value) && typeof value[key] === 'string'
}

export function isCapabilityKind(value: unknown): value is CapabilityKind {
  return typeof value === 'string' && capabilityKinds.includes(value as CapabilityKind)
}

function isClientConnectionMode(value: unknown): value is ClientConnectionMode {
  return typeof value === 'string' && clientConnectionModes.includes(value as ClientConnectionMode)
}

function isClientAuthSource(value: unknown): value is ClientAuthSource {
  return typeof value === 'string' && clientAuthSources.includes(value as ClientAuthSource)
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

function isResourceDescriptor(value: unknown): value is ResourceDescriptor {
  return hasString(value, 'uri') && hasString(value, 'name')
}

function isNamedDescriptor(value: unknown): value is { name: string } {
  return hasString(value, 'name')
}

export function isSkillPath(value: unknown): value is string {
  return typeof value === 'string' && SKILL_PATH_PATTERN.test(value)
}

function isSkillDescriptor(value: unknown): value is SkillDescriptor {
  return isNamedDescriptor(value) && isSkillPath(value.name)
}

function hasDescriptorArray(
  value: unknown,
  key: keyof ClientCapabilityUpdate,
  itemGuard: (item: unknown) => boolean,
  required: boolean
): boolean {
  if (!isJsonObject(value)) {
    return false
  }

  if (!(key in value)) {
    return !required
  }

  const entry = value[key]

  return Array.isArray(entry) && entry.every(itemGuard)
}

function hasClientCapabilities(
  value: unknown,
  required: boolean
): boolean {
  return (
    hasDescriptorArray(value, 'tools', isNamedDescriptor, required) &&
    hasDescriptorArray(value, 'prompts', isNamedDescriptor, required) &&
    hasDescriptorArray(value, 'skills', isSkillDescriptor, required) &&
    hasDescriptorArray(value, 'resources', isResourceDescriptor, required)
  )
}

function isClientCapabilityUpdate(value: unknown): value is ClientCapabilityUpdate {
  return (
    isJsonObject(value) &&
    ('tools' in value || 'prompts' in value || 'skills' in value || 'resources' in value) &&
    hasClientCapabilities(value, false)
  )
}

export function isClientDescriptor(value: unknown): value is ClientDescriptor {
  if (!hasString(value, 'id') || !hasString(value, 'name')) {
    return false
  }

  return hasClientCapabilities(value, true)
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
    case 'updateClientCapabilities':
      return hasString(value, 'clientId') && isClientCapabilityUpdate(value.capabilities)
    case 'callClient':
      if (
        !hasString(object, 'requestId') ||
        !hasString(object, 'clientId') ||
        !isCapabilityKind(isJsonObject(object) ? object.kind : undefined) ||
        ('auth' in object && !isAuthContext(object.auth))
      ) {
        return false
      }

      if (object.kind === 'skill') {
        return hasString(object, 'name') && isSkillPath(object.name)
      }

      return (
        (hasString(object, 'name') && !('uri' in object && object.uri !== undefined)) ||
        (hasString(object, 'uri') && !('name' in object && object.name !== undefined)) ||
        (hasString(object, 'name') && hasString(object, 'uri'))
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
