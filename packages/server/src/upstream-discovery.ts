import { MDP_PROTOCOL_VERSION } from '@modeldriveprotocol/protocol'
import { satisfies, valid, validRange } from 'semver'

import { DEFAULT_DISCOVERY_ATTEMPTS, DEFAULT_DISCOVERY_HOST, DEFAULT_MDP_PORT } from './defaults.js'

export interface MdpServerMeta {
  protocol: 'mdp'
  protocolVersion: string
  supportedProtocolRanges: string[]
  serverId: string
  endpoints: {
    ws: string
    httpLoop: string
    auth: string
    meta: string
  }
  features: {
    upstreamProxy: boolean
  }
}

export interface ProbeMdpServerOptions {
  fetch?: FetchLike
  metaPath?: string
  requiredProtocolVersion?: string
}

export interface DiscoverUpstreamServerOptions extends ProbeMdpServerOptions {
  host?: string
  protocol?: 'ws' | 'wss' | 'http' | 'https'
  startPort?: number
  attempts?: number
}

export interface DiscoveredMdpServer {
  url: string
  meta: MdpServerMeta
}

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

const DEFAULT_META_PATH = '/mdp/meta'

export class IncompatibleMdpProtocolVersionError extends Error {
  readonly name = 'IncompatibleMdpProtocolVersionError'

  constructor(
    readonly serverUrl: string,
    readonly requiredProtocolVersion: string,
    readonly advertisedProtocolVersion: string,
    readonly supportedProtocolRanges: string[]
  ) {
    super(
      [
        `MDP server at ${serverUrl} does not support protocol version ${requiredProtocolVersion}.`,
        `Advertised protocol version: ${advertisedProtocolVersion}.`,
        `Supported semver ranges: ${supportedProtocolRanges.join(', ') || 'none'}.`
      ].join(' ')
    )
  }
}

export async function probeMdpServer(
  serverUrl: string,
  options: ProbeMdpServerOptions = {}
): Promise<DiscoveredMdpServer | undefined> {
  const fetchImpl = options.fetch ?? globalThis.fetch

  if (!fetchImpl) {
    throw new Error('No fetch implementation is available in this runtime')
  }

  const probeUrl = resolveMetaUrl(serverUrl, options.metaPath)
  let response: Response

  try {
    response = await fetchImpl(probeUrl, {
      headers: {
        accept: 'application/json'
      }
    })
  } catch {
    return undefined
  }

  if (!response.ok) {
    return undefined
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    return undefined
  }

  if (!isMdpServerMeta(payload)) {
    return undefined
  }

  assertCompatibleProtocolVersion(
    serverUrl,
    payload,
    options.requiredProtocolVersion ?? MDP_PROTOCOL_VERSION
  )

  return {
    url: serverUrl,
    meta: payload
  }
}

export async function discoverUpstreamMdpServer(
  options: DiscoverUpstreamServerOptions = {}
): Promise<DiscoveredMdpServer | undefined> {
  const host = options.host ?? DEFAULT_DISCOVERY_HOST
  const protocol = options.protocol ?? 'ws'
  const startPort = options.startPort ?? DEFAULT_MDP_PORT
  const attempts = options.attempts ?? DEFAULT_DISCOVERY_ATTEMPTS

  for (let offset = 0; offset < attempts; offset += 1) {
    const serverUrl = `${protocol}://${host}:${startPort + offset}`
    const discovered = await probeMdpServer(serverUrl, options)

    if (discovered) {
      return discovered
    }
  }

  return undefined
}

export function resolveMetaUrl(serverUrl: string, metaPath = DEFAULT_META_PATH): string {
  const url = new URL(serverUrl)

  if (url.protocol === 'ws:') {
    url.protocol = 'http:'
  } else if (url.protocol === 'wss:') {
    url.protocol = 'https:'
  }

  return new URL(metaPath, url).toString()
}

export function getAdvertisedProtocolVersion(meta: MdpServerMeta): string {
  return meta.protocolVersion
}

export function getSupportedProtocolRanges(meta: MdpServerMeta): string[] {
  return [...new Set(meta.supportedProtocolRanges)]
}

function assertCompatibleProtocolVersion(
  serverUrl: string,
  meta: MdpServerMeta,
  requiredProtocolVersion: string
): void {
  if (!valid(requiredProtocolVersion)) {
    throw new Error(`Required protocol version "${requiredProtocolVersion}" is not valid semver`)
  }

  const supportedProtocolRanges = getSupportedProtocolRanges(meta)

  if (supportedProtocolRanges.some((range) => satisfies(requiredProtocolVersion, range))) {
    return
  }

  throw new IncompatibleMdpProtocolVersionError(
    serverUrl,
    requiredProtocolVersion,
    getAdvertisedProtocolVersion(meta),
    supportedProtocolRanges
  )
}

function isMdpServerMeta(value: unknown): value is MdpServerMeta {
  if (!isRecord(value)) {
    return false
  }

  const {
    protocol,
    protocolVersion,
    supportedProtocolRanges,
    serverId,
    endpoints,
    features
  } = value

  if (
    protocol !== 'mdp' ||
    typeof protocolVersion !== 'string' ||
    !valid(protocolVersion) ||
    typeof serverId !== 'string'
  ) {
    return false
  }

  if (
    !Array.isArray(supportedProtocolRanges) ||
    (
      supportedProtocolRanges.length === 0 ||
      supportedProtocolRanges.some((item) => typeof item !== 'string' || !validRange(item))
    )
  ) {
    return false
  }

  if (!isRecord(endpoints) || !isRecord(features)) {
    return false
  }

  return (
    typeof endpoints.ws === 'string' &&
    typeof endpoints.httpLoop === 'string' &&
    typeof endpoints.auth === 'string' &&
    typeof endpoints.meta === 'string' &&
    typeof features.upstreamProxy === 'boolean'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
