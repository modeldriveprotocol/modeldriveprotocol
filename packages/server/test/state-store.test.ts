import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ClientSessionTransport } from '../src/client-session.js'
import { MdpServerRuntime } from '../src/mdp-server.js'
import {
  type MdpFilesystemStateServicesSnapshot,
  type MdpFilesystemStateSnapshot,
  MdpFilesystemStateStore
} from '../src/state-store.js'

const SEARCH_PATH = '/search'

const tempDirs: string[] = []

beforeEach(() => {
  vi.useRealTimers()
})

afterEach(async () => {
  await Promise.allSettled(
    tempDirs.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true })
    })
  )
  vi.useRealTimers()
})

describe('MdpFilesystemStateStore', () => {
  it('writes node-local client, route, and service snapshots to the filesystem', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'mdp-state-store-'))
    tempDirs.push(directory)

    const runtime = new MdpServerRuntime()
    const store = new MdpFilesystemStateStore({
      directory,
      serverId: 'node-a',
      clusterId: 'cluster-a',
      clusterMode: 'auto',
      startupCwd: '/workspace/mdp',
      getClients: () => runtime.listClients(),
      getRoutes: () =>
        runtime.capabilityIndex.listPaths({
          depth: Number.MAX_SAFE_INTEGER
        })
    })

    await store.start()
    await store.setTransportListening({
      ws: 'ws://127.0.0.1:47372',
      httpLoop: 'http://127.0.0.1:47372/mdp/http-loop',
      auth: 'http://127.0.0.1:47372/mdp/auth',
      meta: 'http://127.0.0.1:47372/mdp/meta',
      cluster: 'ws://127.0.0.1:47372/mdp/cluster'
    })
    await store.setMcpBridgeConnected()
    await store.setClusterState({
      id: 'cluster-a',
      membershipMode: 'dynamic',
      membershipFingerprint: 'dynamic',
      role: 'leader',
      term: 2,
      leaderId: 'node-a',
      leaderUrl: 'ws://127.0.0.1:47372',
      leaseDurationMs: 4000,
      knownMemberCount: 1,
      reachableMemberCount: 1,
      quorumSize: 1,
      hasQuorum: true
    })
    await store.setUpstreamProxyInactive()

    const session = runtime.createSession('conn-01', createTransport())
    runtime.handleMessage(session, {
      type: 'registerClient',
      client: {
        id: 'client-01',
        name: 'Browser Client',
        paths: [
          {
            type: 'endpoint',
            path: SEARCH_PATH,
            method: 'GET'
          }
        ]
      }
    })
    await store.syncRegistry()

    const snapshot = await readJson<MdpFilesystemStateSnapshot>(
      path.join(directory, 'snapshot.json')
    )
    const services = await readJson<MdpFilesystemStateServicesSnapshot>(
      path.join(directory, 'services.json')
    )
    const clients = await readJson<MdpFilesystemStateSnapshot['clients']>(
      path.join(directory, 'clients.json')
    )
    const routes = await readJson<MdpFilesystemStateSnapshot['routes']>(
      path.join(directory, 'routes.json')
    )

    expect(snapshot.scope).toBe('node-local')
    expect(snapshot.server).toEqual(expect.objectContaining({
      serverId: 'node-a',
      clusterId: 'cluster-a',
      clusterMode: 'auto',
      cwd: '/workspace/mdp',
      storeDir: directory,
      pid: process.pid
    }))
    expect(services).toEqual(expect.objectContaining({
      transport: expect.objectContaining({
        status: 'listening',
        endpoints: expect.objectContaining({
          ws: 'ws://127.0.0.1:47372'
        })
      }),
      mcpBridge: {
        status: 'connected'
      },
      cluster: expect.objectContaining({
        status: 'running',
        state: expect.objectContaining({
          role: 'leader',
          term: 2
        })
      }),
      upstreamProxy: {
        status: 'inactive'
      }
    }))
    expect(clients).toEqual([
      expect.objectContaining({
        id: 'client-01',
        name: 'Browser Client'
      })
    ])
    expect(routes).toEqual([
      expect.objectContaining({
        clientId: 'client-01',
        path: SEARCH_PATH,
        method: 'GET'
      })
    ])

    await runtime.close()
    await store.markStopped()

    const stoppedSnapshot = await readJson<MdpFilesystemStateSnapshot>(
      path.join(directory, 'snapshot.json')
    )

    expect(stoppedSnapshot.services).toEqual(expect.objectContaining({
      transport: expect.objectContaining({
        status: 'stopped'
      }),
      mcpBridge: {
        status: 'stopped'
      },
      cluster: expect.objectContaining({
        status: 'stopped'
      }),
      upstreamProxy: {
        status: 'stopped'
      }
    }))
    expect(stoppedSnapshot.clients).toEqual([])
    expect(stoppedSnapshot.routes).toEqual([])
  })

  it('refreshes client snapshots when registered session activity changes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T00:00:00.000Z'))

    const directory = await mkdtemp(path.join(os.tmpdir(), 'mdp-state-store-'))
    tempDirs.push(directory)

    const pendingWrites: Promise<void>[] = []
    let store: MdpFilesystemStateStore
    const queueStoreSync = () => {
      pendingWrites.push(store.syncRegistry())
    }

    const runtime = new MdpServerRuntime({
      onClientRegistered: queueStoreSync,
      onClientRemoved: queueStoreSync,
      onClientStateChanged: queueStoreSync
    })
    store = new MdpFilesystemStateStore({
      directory,
      serverId: 'node-a',
      clusterId: 'cluster-a',
      clusterMode: 'auto',
      startupCwd: '/workspace/mdp',
      getClients: () => runtime.listClients(),
      getRoutes: () =>
        runtime.capabilityIndex.listPaths({
          depth: Number.MAX_SAFE_INTEGER
        })
    })

    await store.start()

    const session = runtime.createSession('conn-01', createTransport())
    runtime.handleMessage(session, {
      type: 'registerClient',
      client: {
        id: 'client-01',
        name: 'Browser Client',
        paths: []
      },
      auth: {
        token: 'message-token'
      }
    })
    await flushWrites(pendingWrites)

    const initialClients = await readJson<MdpFilesystemStateSnapshot['clients']>(
      path.join(directory, 'clients.json')
    )
    expect(initialClients).toEqual([
      expect.objectContaining({
        id: 'client-01',
        connection: expect.objectContaining({
          authSource: 'message'
        }),
        lastSeenAt: '2026-04-09T00:00:00.000Z'
      })
    ])

    vi.setSystemTime(new Date('2026-04-09T00:00:05.000Z'))
    runtime.setSessionTransportAuth(session, {
      token: 'transport-token'
    })
    runtime.touchSession(session)
    await flushWrites(pendingWrites)

    const updatedClients = await readJson<MdpFilesystemStateSnapshot['clients']>(
      path.join(directory, 'clients.json')
    )
    expect(updatedClients).toEqual([
      expect.objectContaining({
        id: 'client-01',
        connection: expect.objectContaining({
          authSource: 'transport+message'
        }),
        lastSeenAt: '2026-04-09T00:00:05.000Z'
      })
    ])
  })
})

function createTransport(
  overrides: Partial<ClientSessionTransport> = {}
): ClientSessionTransport {
  return {
    send: vi.fn(),
    close: vi.fn(),
    isOpen: vi.fn(() => true),
    mode: 'ws',
    secure: false,
    auth: undefined,
    ...overrides
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

async function flushWrites(pendingWrites: Promise<void>[]): Promise<void> {
  const writes = pendingWrites.splice(0)
  await Promise.all(writes)
}
