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
    cluster: string
  }
  features: {
    upstreamProxy: boolean
    clusterControl: boolean
  }
  cluster: {
    id: string
    membershipMode: 'dynamic' | 'static'
    membershipFingerprint: string
    role: 'leader' | 'follower' | 'candidate'
    term: number
    leaderId?: string
    leaderUrl?: string
    leaseDurationMs: number
    knownMemberCount?: number
    reachableMemberCount?: number
    quorumSize?: number
    hasQuorum?: boolean
  }
}

export interface ProbeMdpServerOptions {
  fetch?: FetchLike
  metaPath?: string
  requiredProtocolVersion?: string
  requiredClusterId?: string
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

export class UnexpectedMdpClusterIdError extends Error {
  readonly name = 'UnexpectedMdpClusterIdError'

  constructor(
    readonly serverUrl: string,
    readonly requiredClusterId: string,
    readonly advertisedClusterId: string
  ) {
    super(
      `MDP server at ${serverUrl} belongs to cluster ${advertisedClusterId}, expected ${requiredClusterId}.`
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
  assertCompatibleClusterId(serverUrl, payload, options.requiredClusterId)

  const resolvedEndpoints = resolveAdvertisedEndpoints(serverUrl, payload.endpoints)

  return {
    url: resolvedEndpoints.ws,
    meta: {
      ...payload,
      endpoints: resolvedEndpoints
    }
  }
}

export async function discoverUpstreamMdpServer(
  options: DiscoverUpstreamServerOptions = {}
): Promise<DiscoveredMdpServer | undefined> {
  const discovered = await discoverMdpServers(options)
  return chooseDiscoveredPrimary(discovered)
}

export async function discoverMdpServers(
  options: DiscoverUpstreamServerOptions = {}
): Promise<DiscoveredMdpServer[]> {
  const host = options.host ?? DEFAULT_DISCOVERY_HOST
  const protocol = options.protocol ?? 'ws'
  const startPort = options.startPort ?? DEFAULT_MDP_PORT
  const attempts = options.attempts ?? DEFAULT_DISCOVERY_ATTEMPTS
  const discovered: DiscoveredMdpServer[] = []

  for (let offset = 0; offset < attempts; offset += 1) {
    const serverUrl = `${protocol}://${host}:${startPort + offset}`
    let server: DiscoveredMdpServer | undefined

    try {
      server = await probeMdpServer(serverUrl, options)
    } catch (error) {
      if (error instanceof UnexpectedMdpClusterIdError) {
        continue
      }
      throw error
    }

    if (server) {
      discovered.push(server)
    }
  }

  return discovered
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

function assertCompatibleClusterId(
  serverUrl: string,
  meta: MdpServerMeta,
  requiredClusterId: string | undefined
): void {
  if (!requiredClusterId || meta.cluster.id === requiredClusterId) {
    return
  }

  throw new UnexpectedMdpClusterIdError(serverUrl, requiredClusterId, meta.cluster.id)
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
    features,
    cluster
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

  if (!isRecord(endpoints) || !isRecord(features) || !isRecord(cluster)) {
    return false
  }

  return (
    typeof endpoints.ws === 'string' &&
    typeof endpoints.httpLoop === 'string' &&
    typeof endpoints.auth === 'string' &&
    typeof endpoints.meta === 'string' &&
    typeof endpoints.cluster === 'string' &&
    typeof features.upstreamProxy === 'boolean' &&
    typeof features.clusterControl === 'boolean' &&
    typeof cluster.id === 'string' &&
    (cluster.membershipMode === 'dynamic' || cluster.membershipMode === 'static') &&
    typeof cluster.membershipFingerprint === 'string' &&
    (
      cluster.role === 'leader' ||
      cluster.role === 'follower' ||
      cluster.role === 'candidate'
    ) &&
    typeof cluster.term === 'number' &&
    Number.isInteger(cluster.term) &&
    cluster.term >= 0 &&
    (!('leaderId' in cluster) || typeof cluster.leaderId === 'string') &&
    (!('leaderUrl' in cluster) || typeof cluster.leaderUrl === 'string') &&
    typeof cluster.leaseDurationMs === 'number' &&
    Number.isInteger(cluster.leaseDurationMs) &&
    cluster.leaseDurationMs > 0
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function chooseDiscoveredPrimary(
  servers: DiscoveredMdpServer[]
): DiscoveredMdpServer | undefined {
  const leaders = servers
    .filter((server) => server.meta.cluster.role === 'leader')
    .sort((left, right) => {
      if (right.meta.cluster.term !== left.meta.cluster.term) {
        return right.meta.cluster.term - left.meta.cluster.term
      }

      return left.meta.serverId.localeCompare(right.meta.serverId)
    })

  return leaders[0] ?? servers[0]
}

function resolveAdvertisedEndpoints(
  serverUrl: string,
  endpoints: MdpServerMeta['endpoints']
): MdpServerMeta['endpoints'] {
  return {
    ws: normalizeAdvertisedUrl(serverUrl, endpoints.ws),
    httpLoop: normalizeAdvertisedUrl(serverUrl, endpoints.httpLoop),
    auth: normalizeAdvertisedUrl(serverUrl, endpoints.auth),
    meta: normalizeAdvertisedUrl(serverUrl, endpoints.meta),
    cluster: normalizeAdvertisedUrl(serverUrl, endpoints.cluster)
  }
}

function normalizeAdvertisedUrl(referenceUrl: string, advertisedUrl: string): string {
  const reference = new URL(referenceUrl)
  const advertised = new URL(advertisedUrl)

  if (isWildcardHost(advertised.hostname)) {
    advertised.hostname = reference.hostname
  }

  return stripRootTrailingSlash(advertised.toString())
}

function isWildcardHost(hostname: string): boolean {
  return hostname === '0.0.0.0' || hostname === '::' || hostname === '[::]'
}

function stripRootTrailingSlash(url: string): string {
  return url.endsWith('/') && !url.slice(0, -1).includes('/', url.indexOf('://') + 3)
    ? url.slice(0, -1)
    : url
}
