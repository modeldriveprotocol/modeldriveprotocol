import { randomUUID } from 'node:crypto'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { IndexedPathDescriptor, ListedClient } from '@modeldriveprotocol/protocol'

import type { ClusterManagerState } from './cluster-manager.js'

type ServerClusterMode = 'standalone' | 'auto' | 'proxy-required'

interface TransportEndpoints {
  ws: string
  httpLoop: string
  auth: string
  meta: string
  cluster: string
}

interface TransportServiceSnapshot {
  status: 'starting' | 'listening' | 'stopped'
  endpoints?: TransportEndpoints
}

interface BridgeServiceSnapshot {
  status: 'starting' | 'connected' | 'stopped'
}

interface ClusterServiceSnapshot {
  status: 'disabled' | 'starting' | 'running' | 'stopped'
  state?: ClusterManagerState
}

interface UpstreamProxyServiceSnapshot {
  status: 'inactive' | 'connecting' | 'following' | 'stopped'
  leaderId?: string
  leaderUrl?: string
  term?: number
}

export interface MdpFilesystemStateServicesSnapshot {
  transport: TransportServiceSnapshot
  mcpBridge: BridgeServiceSnapshot
  cluster: ClusterServiceSnapshot
  upstreamProxy: UpstreamProxyServiceSnapshot
}

interface MdpFilesystemStateServerSnapshot {
  serverId: string
  clusterId: string
  clusterMode: ServerClusterMode
  cwd: string
  storeDir: string
  pid: number
  startedAt: string
}

export interface MdpFilesystemStateSnapshot {
  scope: 'node-local'
  updatedAt: string
  server: MdpFilesystemStateServerSnapshot
  services: MdpFilesystemStateServicesSnapshot
  clients: ListedClient[]
  routes: IndexedPathDescriptor[]
}

export interface MdpFilesystemStateStoreOptions {
  directory: string
  serverId: string
  clusterId: string
  clusterMode: ServerClusterMode
  startupCwd: string
  getClients: () => ListedClient[]
  getRoutes: () => IndexedPathDescriptor[]
  pid?: number
  now?: () => Date
}

const JSON_FILES = {
  snapshot: 'snapshot.json',
  clients: 'clients.json',
  routes: 'routes.json',
  services: 'services.json'
} as const

export class MdpFilesystemStateStore {
  private readonly directory: string
  private readonly getClients: () => ListedClient[]
  private readonly getRoutes: () => IndexedPathDescriptor[]
  private readonly now: () => Date
  private readonly server: MdpFilesystemStateServerSnapshot
  private readonly services: MdpFilesystemStateServicesSnapshot
  private writeChain = Promise.resolve()

  constructor(options: MdpFilesystemStateStoreOptions) {
    this.directory = options.directory
    this.getClients = options.getClients
    this.getRoutes = options.getRoutes
    this.now = options.now ?? (() => new Date())

    const startedAt = this.now().toISOString()

    this.server = {
      serverId: options.serverId,
      clusterId: options.clusterId,
      clusterMode: options.clusterMode,
      cwd: options.startupCwd,
      storeDir: options.directory,
      pid: options.pid ?? process.pid,
      startedAt
    }
    this.services = {
      transport: {
        status: 'starting'
      },
      mcpBridge: {
        status: 'starting'
      },
      cluster: options.clusterMode === 'standalone'
        ? {
          status: 'disabled'
        }
        : {
          status: 'starting'
        },
      upstreamProxy: {
        status: 'inactive'
      }
    }
  }

  get storeDir(): string {
    return this.directory
  }

  async start(): Promise<void> {
    await mkdir(this.directory, { recursive: true })
    await this.queueWrite()
  }

  async syncRegistry(): Promise<void> {
    await this.queueWrite()
  }

  async setTransportListening(endpoints: TransportEndpoints): Promise<void> {
    await this.queueWrite(() => {
      this.services.transport = {
        status: 'listening',
        endpoints
      }
    })
  }

  async setMcpBridgeConnected(): Promise<void> {
    await this.queueWrite(() => {
      this.services.mcpBridge = {
        status: 'connected'
      }
    })
  }

  async setClusterState(state: ClusterManagerState): Promise<void> {
    await this.queueWrite(() => {
      this.services.cluster = {
        status: 'running',
        state
      }
    })
  }

  async setUpstreamProxyInactive(): Promise<void> {
    await this.queueWrite(() => {
      this.services.upstreamProxy = {
        status: 'inactive'
      }
    })
  }

  async setUpstreamProxyConnecting(
    state: Pick<ClusterManagerState, 'leaderId' | 'leaderUrl' | 'term'>
  ): Promise<void> {
    await this.queueWrite(() => {
      this.services.upstreamProxy = {
        status: 'connecting',
        ...(state.leaderId ? { leaderId: state.leaderId } : {}),
        ...(state.leaderUrl ? { leaderUrl: state.leaderUrl } : {}),
        term: state.term
      }
    })
  }

  async setUpstreamProxyFollowing(
    state: Pick<ClusterManagerState, 'leaderId' | 'leaderUrl' | 'term'>
  ): Promise<void> {
    await this.queueWrite(() => {
      this.services.upstreamProxy = {
        status: 'following',
        ...(state.leaderId ? { leaderId: state.leaderId } : {}),
        ...(state.leaderUrl ? { leaderUrl: state.leaderUrl } : {}),
        term: state.term
      }
    })
  }

  async markStopped(): Promise<void> {
    await this.queueWrite(() => {
      this.services.transport = {
        status: 'stopped',
        ...(this.services.transport.endpoints
          ? { endpoints: this.services.transport.endpoints }
          : {})
      }
      this.services.mcpBridge = {
        status: 'stopped'
      }
      this.services.cluster = this.services.cluster.status === 'disabled'
        ? {
          status: 'disabled'
        }
        : {
          status: 'stopped',
          ...(this.services.cluster.state
            ? { state: this.services.cluster.state }
            : {})
        }
      this.services.upstreamProxy = {
        status: 'stopped',
        ...(this.services.upstreamProxy.leaderId
          ? { leaderId: this.services.upstreamProxy.leaderId }
          : {}),
        ...(this.services.upstreamProxy.leaderUrl
          ? { leaderUrl: this.services.upstreamProxy.leaderUrl }
          : {}),
        ...(this.services.upstreamProxy.term !== undefined
          ? { term: this.services.upstreamProxy.term }
          : {})
      }
    })
  }

  private async queueWrite(mutator?: () => void): Promise<void> {
    mutator?.()
    this.writeChain = this.writeChain
      .catch(() => {})
      .then(async () => {
        await this.persistSnapshot()
      })
    await this.writeChain
  }

  private async persistSnapshot(): Promise<void> {
    const snapshot = this.snapshot()

    await Promise.all([
      writeJsonFile(path.join(this.directory, JSON_FILES.snapshot), snapshot),
      writeJsonFile(path.join(this.directory, JSON_FILES.clients), snapshot.clients),
      writeJsonFile(path.join(this.directory, JSON_FILES.routes), snapshot.routes),
      writeJsonFile(path.join(this.directory, JSON_FILES.services), snapshot.services)
    ])
  }

  private snapshot(): MdpFilesystemStateSnapshot {
    return JSON.parse(JSON.stringify({
      scope: 'node-local',
      updatedAt: this.now().toISOString(),
      server: this.server,
      services: this.services,
      clients: this.getClients(),
      routes: this.getRoutes()
    })) as MdpFilesystemStateSnapshot
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(tempPath, filePath)
}
