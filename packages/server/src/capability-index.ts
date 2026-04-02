import type {
  ClientConnectionDescriptor,
  ClientDescriptor,
  HttpMethod,
  IndexedPathDescriptor,
  ListedClient,
  PathDescriptor
} from '@modeldriveprotocol/protocol'
import {
  comparePathSpecificity,
  matchPathPattern
} from '@modeldriveprotocol/protocol'

export interface RegisteredClientSnapshot {
  descriptor: ClientDescriptor
  connectedAt: Date
  lastSeenAt: Date
  connection: ClientConnectionDescriptor
}

export interface PathTarget {
  clientId: string
  method: HttpMethod
  path: string
}

export interface ResolvedPathTarget {
  descriptor: PathDescriptor
  params: Record<string, unknown>
}

export interface ListClientsOptions {
  search?: string
}

export interface ListPathsOptions {
  clientId?: string
  search?: string
  depth?: number
}

export class CapabilityIndex {
  constructor(
    private readonly listRegisteredClients: () => RegisteredClientSnapshot[]
  ) {}

  listClients(options: ListClientsOptions = {}): ListedClient[] {
    const search = normalizeSearch(options.search)

    return this.listRegisteredClients()
      .map(({ descriptor, connectedAt, lastSeenAt, connection }) => ({
        ...descriptor,
        status: 'online' as const,
        connectedAt: connectedAt.toISOString(),
        lastSeenAt: lastSeenAt.toISOString(),
        connection
      }))
      .filter((client) => !search || matchesClientSearch(client, search))
  }

  listPaths(optionsOrClientId?: string | ListPathsOptions): IndexedPathDescriptor[] {
    const options = normalizeListPathsOptions(optionsOrClientId)
    const search = normalizeSearch(options.search)
    const depthLimit = resolveDepthLimit(options.depth, search)

    return this.filterClients(options.clientId).flatMap(({ descriptor }) =>
      descriptor.paths
        .map((pathDescriptor) => ({
          clientId: descriptor.id,
          clientName: descriptor.name,
          ...pathDescriptor
        }))
        .filter(
          (pathDescriptor) =>
            (depthLimit === undefined || getPathCatalogDepth(pathDescriptor.path) <= depthLimit) &&
            (!search || matchesPathSearch(pathDescriptor, search))
        )
    )
  }

  resolveTarget(
    clientId: string,
    method: HttpMethod,
    path: string
  ): ResolvedPathTarget | undefined {
    const client = this.findClient(clientId)

    if (!client) {
      return undefined
    }

    let bestMatch:
      | (ResolvedPathTarget & {
          specificity: number[]
        })
      | undefined

    for (const descriptor of client.paths) {
      if (!matchesMethod(descriptor, method)) {
        continue
      }

      const match = matchPathPattern(descriptor.path, path)

      if (!match) {
        continue
      }

      if (
        !bestMatch ||
        comparePathSpecificity(match.specificity, bestMatch.specificity) > 0
      ) {
        bestMatch = {
          descriptor,
          params: match.params,
          specificity: match.specificity
        }
      }
    }

    return bestMatch
      ? {
          descriptor: bestMatch.descriptor,
          params: bestMatch.params
        }
      : undefined
  }

  listAllowedMethods(clientId: string, path: string): HttpMethod[] {
    const client = this.findClient(clientId)

    if (!client) {
      return []
    }

    const methods = new Set<HttpMethod>()

    for (const descriptor of client.paths) {
      if (!matchPathPattern(descriptor.path, path)) {
        continue
      }

      methods.add(descriptor.type === 'endpoint' ? descriptor.method : 'GET')
    }

    return [...methods]
  }

  hasTarget(target: PathTarget): boolean {
    return this.resolveTarget(target.clientId, target.method, target.path) !== undefined
  }

  findMatchingClientIds(target: Omit<PathTarget, 'clientId'>): string[] {
    return this.listRegisteredClients()
      .map((snapshot) => snapshot.descriptor)
      .filter((descriptor) =>
        descriptor.paths.some((pathDescriptor) =>
          matchesMethod(pathDescriptor, target.method) &&
          matchPathPattern(pathDescriptor.path, target.path) !== undefined
        )
      )
      .map((descriptor) => descriptor.id)
  }

  private filterClients(clientId?: string): RegisteredClientSnapshot[] {
    const snapshots = this.listRegisteredClients()

    return clientId === undefined
      ? snapshots
      : snapshots.filter(({ descriptor }) => descriptor.id === clientId)
  }

  private findClient(clientId: string): ClientDescriptor | undefined {
    return this.listRegisteredClients().find(
      ({ descriptor }) => descriptor.id === clientId
    )?.descriptor
  }
}

function matchesMethod(descriptor: PathDescriptor, method: HttpMethod): boolean {
  return descriptor.type === 'endpoint' ? descriptor.method === method : method === 'GET'
}

function normalizeListPathsOptions(
  optionsOrClientId: string | ListPathsOptions | undefined
): ListPathsOptions {
  if (typeof optionsOrClientId === 'string') {
    return { clientId: optionsOrClientId }
  }

  return optionsOrClientId ?? {}
}

function normalizeSearch(search: string | undefined): string | undefined {
  const normalized = search?.trim().toLowerCase()
  return normalized ? normalized : undefined
}

function resolveDepthLimit(
  depth: number | undefined,
  search: string | undefined
): number | undefined {
  if (depth === undefined) {
    return search ? undefined : 1
  }

  if (!Number.isSafeInteger(depth) || depth < 1) {
    throw new Error('listPaths depth must be a positive integer')
  }

  return depth
}

function matchesClientSearch(client: ListedClient, search: string): boolean {
  return matchesSearch(search, [
    client.id,
    client.name,
    client.description,
    client.version,
    client.platform,
    client.metadata,
    client.status,
    client.connectedAt,
    client.lastSeenAt,
    client.connection.mode,
    client.connection.authSource,
    client.connection.secure ? 'secure' : 'insecure',
    ...client.paths.flatMap((pathDescriptor) => collectPathSearchTerms(pathDescriptor))
  ])
}

function matchesPathSearch(descriptor: IndexedPathDescriptor, search: string): boolean {
  return matchesSearch(search, collectPathSearchTerms(descriptor))
}

function collectPathSearchTerms(
  descriptor: IndexedPathDescriptor | PathDescriptor
): unknown[] {
  const terms: unknown[] = [
    'clientId' in descriptor ? descriptor.clientId : undefined,
    'clientName' in descriptor ? descriptor.clientName : undefined,
    descriptor.type,
    descriptor.path,
    descriptor.description,
    'contentType' in descriptor ? descriptor.contentType : undefined
  ]

  if (descriptor.type === 'endpoint') {
    terms.push(descriptor.method, descriptor.inputSchema, descriptor.outputSchema)
  }

  if (descriptor.type === 'prompt') {
    terms.push(descriptor.inputSchema, descriptor.outputSchema)
  }

  return terms
}

function matchesSearch(search: string, terms: unknown[]): boolean {
  return terms.some((term) => normalizeSearchTerm(term)?.includes(search))
}

function normalizeSearchTerm(term: unknown): string | undefined {
  if (term === undefined) {
    return undefined
  }

  if (
    term === null ||
    typeof term === 'string' ||
    typeof term === 'number' ||
    typeof term === 'boolean'
  ) {
    return String(term).toLowerCase()
  }

  try {
    return JSON.stringify(term).toLowerCase()
  } catch {
    return undefined
  }
}

function getPathCatalogDepth(path: string): number {
  const segments = path.split('/').filter(Boolean)
  return Math.max(1, segments.length - 2)
}
