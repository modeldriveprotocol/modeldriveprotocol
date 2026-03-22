import { afterEach, describe, expect, it } from 'vitest'

import { MdpClusterManager, type ClusterManagerState } from '../src/cluster-manager.js'
import { MdpServerRuntime } from '../src/mdp-server.js'
import { MdpTransportServer } from '../src/transport-server.js'

interface ClusterNode {
  serverId: string
  manager: {
    close(): Promise<void>
    readonly state: ClusterManagerState
  }
  transportServer: MdpTransportServer
}

interface StartNodeOptions {
  clusterId?: string
  clusterMembers?: string[]
}

const nodes: ClusterNode[] = []
const BASE_PORT = 48720

afterEach(async () => {
  await Promise.allSettled(nodes.splice(0).map((node) => stopNode(node)))
})

describe('cluster manager', () => {
  it('elects one primary and exposes cluster state through metadata', async () => {
    const cluster = await Promise.all([
      startNode('node-a', BASE_PORT),
      startNode('node-b', BASE_PORT + 1),
      startNode('node-c', BASE_PORT + 2)
    ])
    nodes.push(...cluster)

    await eventually(async () => {
      const leaders = cluster.filter((node) => node.manager.state.role === 'leader')
      expect(leaders).toHaveLength(1)

      const leader = leaders[0]
      expect(leader).toBeDefined()

      for (const node of cluster) {
        const response = await fetch(node.transportServer.endpoints.meta)
        const payload = await response.json() as {
          cluster: {
            id: string
            role: string
            term: number
            leaderId?: string
            knownMemberCount: number
            reachableMemberCount: number
            quorumSize: number
            hasQuorum: boolean
          }
        }

        if (node === leader) {
          expect(payload.cluster.role).toBe('leader')
          expect(payload.cluster.leaderId).toBe(node.serverId)
        } else {
          expect(payload.cluster.role).toBe('follower')
          expect(payload.cluster.leaderId).toBe(leader.serverId)
        }

        expect(payload.cluster.id).toBe('cluster-local')
        expect(payload.cluster.term).toBeGreaterThanOrEqual(1)
        expect(payload.cluster.knownMemberCount).toBe(3)
        expect(payload.cluster.quorumSize).toBe(2)
        expect(payload.cluster.reachableMemberCount).toBeGreaterThanOrEqual(2)
        expect(payload.cluster.hasQuorum).toBe(true)
      }
    })
  })

  it('elects a new primary after the old primary resigns gracefully', async () => {
    const cluster = await Promise.all([
      startNode('node-a', BASE_PORT),
      startNode('node-b', BASE_PORT + 1),
      startNode('node-c', BASE_PORT + 2)
    ])
    nodes.push(...cluster)

    const initialLeader = await eventually(() => {
      const leaders = cluster.filter((node) => node.manager.state.role === 'leader')
      expect(leaders).toHaveLength(1)
      return leaders[0]!
    })
    const initialTerm = initialLeader.manager.state.term

    await stopNode(initialLeader)
    nodes.splice(nodes.findIndex((node) => node.serverId === initialLeader.serverId), 1)

    const survivors = cluster.filter((node) => node.serverId !== initialLeader.serverId)

    await eventually(() => {
      const leaders = survivors.filter((node) => node.manager.state.role === 'leader')
      expect(leaders).toHaveLength(1)

      const nextLeader = leaders[0]!
      expect(nextLeader.serverId).not.toBe(initialLeader.serverId)
      expect(nextLeader.manager.state.term).toBeGreaterThan(initialTerm)

      const follower = survivors.find((node) => node.serverId !== nextLeader.serverId)
      expect(follower?.manager.state.role).toBe('follower')
      expect(follower?.manager.state.leaderId).toBe(nextLeader.serverId)
      expect(follower?.manager.state.term).toBe(nextLeader.manager.state.term)
    })
  })

  it('ignores stale discovery metadata when an active primary lease already exists', async () => {
    const cluster = await Promise.all([
      startNode('node-a', BASE_PORT),
      startNode('node-b', BASE_PORT + 1)
    ])
    nodes.push(...cluster)

    const leader = await eventually(() => {
      const leaders = cluster.filter((node) => node.manager.state.role === 'leader')
      expect(leaders).toHaveLength(1)
      return leaders[0]!
    })
    const follower = cluster.find((node) => node.serverId !== leader.serverId)!

    const staleRuntime = new MdpServerRuntime()
    const staleServer = new MdpTransportServer(staleRuntime, {
      host: '127.0.0.1',
      port: BASE_PORT + 2,
      serverId: 'stale-leader',
      clusterMetaProvider: () => ({
        id: 'cluster-local',
        role: 'leader',
        term: leader.manager.state.term,
        leaderId: 'stale-leader',
        leaderUrl: `ws://127.0.0.1:${BASE_PORT + 2}`,
        leaseDurationMs: 140
      }),
      onClusterConnection: (socket) => {
        socket.close()
      }
    })
    nodes.push({
      serverId: 'stale-leader',
      manager: createNoopManager(),
      transportServer: staleServer
    })
    await staleServer.start()

    await eventually(() => {
      expect(follower.manager.state.role).toBe('follower')
      expect(follower.manager.state.leaderId).toBe(leader.serverId)
      expect(follower.manager.state.term).toBe(leader.manager.state.term)
    })
  })

  it('relinquishes leadership after quorum loss and does not self-elect from a shrunken live view', async () => {
    const cluster = await Promise.all([
      startNode('node-a', BASE_PORT),
      startNode('node-b', BASE_PORT + 1),
      startNode('node-c', BASE_PORT + 2)
    ])
    nodes.push(...cluster)

    const leader = await eventually(() => {
      const leaders = cluster.filter((node) => node.manager.state.role === 'leader')
      expect(leaders).toHaveLength(1)
      return leaders[0]!
    })
    const followers = cluster.filter((node) => node.serverId !== leader.serverId)

    for (const follower of followers) {
      await stopNode(follower)
      nodes.splice(nodes.findIndex((node) => node.serverId === follower.serverId), 1)
    }

    await eventually(() => {
      expect(leader.manager.state.role).not.toBe('leader')
      expect(leader.manager.state.leaderId).toBeUndefined()
      expect(leader.manager.state.hasQuorum).toBe(false)
      expect(leader.manager.state.quorumSize).toBe(2)
      expect(leader.manager.state.knownMemberCount).toBe(3)
      expect(leader.manager.state.reachableMemberCount).toBe(1)
    })
  })

  it('reconverges once quorum is restored after a leader steps down', async () => {
    const cluster = await Promise.all([
      startNode('node-a', BASE_PORT),
      startNode('node-b', BASE_PORT + 1),
      startNode('node-c', BASE_PORT + 2)
    ])
    nodes.push(...cluster)

    const originalLeader = await eventually(() => {
      const leaders = cluster.filter((node) => node.manager.state.role === 'leader')
      expect(leaders).toHaveLength(1)
      return leaders[0]!
    })
    const followers = cluster.filter((node) => node.serverId !== originalLeader.serverId)
    const [recoveringFollower, removedFollower] = followers

    await stopNode(recoveringFollower)
    await stopNode(removedFollower)
    nodes.splice(nodes.findIndex((node) => node.serverId === recoveringFollower.serverId), 1)
    nodes.splice(nodes.findIndex((node) => node.serverId === removedFollower.serverId), 1)

    await eventually(() => {
      expect(originalLeader.manager.state.role).not.toBe('leader')
      expect(originalLeader.manager.state.hasQuorum).toBe(false)
    })

    const restartedFollower = await startNode(
      recoveringFollower.serverId,
      recoveringFollower.transportServer.address.port
    )
    nodes.push(restartedFollower)

    await eventually(() => {
      const participants = [originalLeader, restartedFollower]
      const leaders = participants.filter((node) => node.manager.state.role === 'leader')
      expect(leaders).toHaveLength(1)

      const leader = leaders[0]!
      const follower = participants.find((node) => node.serverId !== leader.serverId)!
      expect(leader.manager.state.hasQuorum).toBe(true)
      expect(leader.manager.state.quorumSize).toBe(2)
      expect(leader.manager.state.knownMemberCount).toBeGreaterThanOrEqual(2)
      expect(leader.manager.state.reachableMemberCount).toBe(2)

      expect(follower.manager.state.role).toBe('follower')
      expect(follower.manager.state.leaderId).toBe(leader.serverId)
      expect(follower.manager.state.hasQuorum).toBe(true)
      expect(follower.manager.state.quorumSize).toBe(2)
      expect(follower.manager.state.knownMemberCount).toBeGreaterThanOrEqual(2)
      expect(follower.manager.state.reachableMemberCount).toBe(2)

      expect(originalLeader.manager.state.knownMemberCount).toBe(3)
      expect(restartedFollower.manager.state.knownMemberCount).toBe(2)
    })
  })

  it('uses configured static membership for quorum and ignores unknown peers', async () => {
    const configuredMembers = ['node-a', 'node-b']
    const cluster = await Promise.all([
      startNode('node-a', BASE_PORT, { clusterMembers: configuredMembers }),
      startNode('node-b', BASE_PORT + 1, { clusterMembers: configuredMembers }),
      startNode('node-outsider', BASE_PORT + 2)
    ])
    nodes.push(...cluster)

    const configuredNodes = cluster.filter((node) => configuredMembers.includes(node.serverId))

    await eventually(() => {
      const leaders = configuredNodes.filter((node) => node.manager.state.role === 'leader')
      expect(leaders).toHaveLength(1)

      for (const node of configuredNodes) {
        expect(node.manager.state.knownMemberCount).toBe(2)
        expect(node.manager.state.quorumSize).toBe(2)
        expect(node.manager.state.hasQuorum).toBe(true)
      }
    })

    const outsider = cluster.find((node) => node.serverId === 'node-outsider')!
    expect(outsider.manager.state.knownMemberCount).toBeGreaterThanOrEqual(1)
    expect(configuredNodes.every((node) => node.manager.state.knownMemberCount === 2)).toBe(true)
  })

  it('ignores peers from a different cluster id', async () => {
    const cluster = await Promise.all([
      startNode('node-a', BASE_PORT, { clusterId: 'cluster-a' }),
      startNode('node-b', BASE_PORT + 1, { clusterId: 'cluster-a' }),
      startNode('node-c', BASE_PORT + 2, { clusterId: 'cluster-b' })
    ])
    nodes.push(...cluster)

    const clusterA = cluster.filter((node) => node.manager.state.id === 'cluster-a')
    const clusterB = cluster.find((node) => node.manager.state.id === 'cluster-b')!

    await eventually(() => {
      const leaders = clusterA.filter((node) => node.manager.state.role === 'leader')
      expect(leaders).toHaveLength(1)

      for (const node of clusterA) {
        expect(node.manager.state.id).toBe('cluster-a')
        expect(node.manager.state.knownMemberCount).toBe(2)
        expect(node.manager.state.quorumSize).toBe(2)
        expect(node.manager.state.hasQuorum).toBe(true)
      }

      expect(clusterB.manager.state.id).toBe('cluster-b')
      expect(clusterB.manager.state.knownMemberCount).toBe(1)
      expect(clusterB.manager.state.quorumSize).toBe(1)
    })
  })

  it('rejects explicit seed peers that are outside the configured membership', async () => {
    const leader = await startNode('node-a', BASE_PORT)
    nodes.push(leader)

    const joiningRuntime = new MdpServerRuntime()
    let joiningTransportServer: MdpTransportServer

    const joiningManager = new MdpClusterManager({
      serverId: 'node-b',
      clusterId: 'cluster-local',
      clusterMode: 'auto',
      clusterMembers: ['node-b', 'node-c'],
      discoverHost: '127.0.0.1',
      discoverStartPort: BASE_PORT,
      discoverAttempts: 1,
      seedUrls: [leader.transportServer.endpoints.ws],
      heartbeatIntervalMs: 40,
      leaseDurationMs: 140,
      electionTimeoutMinMs: 180,
      electionTimeoutMaxMs: 260,
      discoveryIntervalMs: 60,
      getSelfEndpoints: () => ({
        ws: joiningTransportServer.endpoints.ws,
        cluster: joiningTransportServer.endpoints.cluster
      })
    })

    joiningTransportServer = new MdpTransportServer(joiningRuntime, {
      host: '127.0.0.1',
      port: BASE_PORT + 3,
      serverId: 'node-b',
      clusterMetaProvider: () => joiningManager.state,
      onClusterConnection: (socket) => {
        joiningManager.handleConnection(socket)
      }
    })

    nodes.push({
      serverId: 'node-b',
      manager: joiningManager,
      transportServer: joiningTransportServer
    })

    await joiningTransportServer.start()

    await expect(joiningManager.start()).rejects.toThrow(
      'Discovered seed peer node-a is not part of the configured cluster membership'
    )
  })
})

async function startNode(serverId: string, port: number, options: StartNodeOptions = {}): Promise<ClusterNode> {
  const runtime = new MdpServerRuntime()
  let transportServer: MdpTransportServer

  const manager = new MdpClusterManager({
    serverId,
    clusterId: options.clusterId ?? 'cluster-local',
    clusterMode: 'auto',
    ...(options.clusterMembers ? { clusterMembers: options.clusterMembers } : {}),
    discoverHost: '127.0.0.1',
    discoverStartPort: BASE_PORT,
    discoverAttempts: 3,
    heartbeatIntervalMs: 40,
    leaseDurationMs: 140,
    electionTimeoutMinMs: 180,
    electionTimeoutMaxMs: 260,
    discoveryIntervalMs: 60,
    getSelfEndpoints: () => ({
      ws: transportServer.endpoints.ws,
      cluster: transportServer.endpoints.cluster
    })
  })

  transportServer = new MdpTransportServer(runtime, {
    host: '127.0.0.1',
    port,
    serverId,
    clusterMetaProvider: () => manager.state,
    onClusterConnection: (socket) => {
      manager.handleConnection(socket)
    }
  })

  await transportServer.start()
  await manager.start()

  return {
    serverId,
    manager,
    transportServer
  }
}

async function stopNode(node: ClusterNode): Promise<void> {
  await Promise.allSettled([
    node.manager.close(),
    node.transportServer.stop()
  ])
}

function createNoopManager(): ClusterNode['manager'] {
  return {
    close: async () => {},
    get state() {
      return {
        id: 'noop-cluster',
        role: 'leader',
        term: 0,
        leaderId: 'noop',
        leaderUrl: 'ws://127.0.0.1:0',
        leaseDurationMs: 1,
        knownMemberCount: 1,
        reachableMemberCount: 1,
        quorumSize: 1,
        hasQuorum: true
      }
    }
  }
}

async function eventually<T>(assertion: () => T | Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await assertion()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => {
        setTimeout(resolve, 25)
      })
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Condition was not met in time')
}
