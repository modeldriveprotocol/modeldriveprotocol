import { describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'

import { MdpClusterManager } from '../src/cluster-manager.js'

describe('cluster manager state change notifications', () => {
  it('emits a state change when reachability expires with no new peer events', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T00:00:00.000Z'))

    const onStateChange = vi.fn()
    const manager = createManager(onStateChange)
    const link = createLink()

    try {
      setLeaderState(manager)

      await (manager as unknown as {
        handleClusterMessage: (link: unknown, message: unknown) => Promise<void>
      }).handleClusterMessage(link, {
        type: 'clusterHeartbeatAck',
        clusterId: 'cluster-local',
        serverId: 'node-b',
        term: 1,
        followerId: 'node-b',
        leaderId: 'node-a',
        timestamp: Date.now()
      })

      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({
        roleChanged: false,
        leaderChanged: false,
        state: expect.objectContaining({
          knownMemberCount: 2,
          reachableMemberCount: 2,
          hasQuorum: true
        })
      }))

      onStateChange.mockClear()

      await vi.advanceTimersByTimeAsync(141)

      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({
        roleChanged: false,
        leaderChanged: false,
        state: expect.objectContaining({
          knownMemberCount: 2,
          reachableMemberCount: 1,
          hasQuorum: false
        })
      }))
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
      await manager.close()
    }
  })

  it('emits a state change when an incoming peer message restores reachability', async () => {
    const onStateChange = vi.fn()
    const manager = createManager(onStateChange)
    const link = createLink()

    setLeaderState(manager)
    setPeerState(manager, link, {
      attachLink: false,
      lastSeenAt: Date.now() - 10_000
    })

    await (manager as unknown as {
      handleClusterMessage: (link: unknown, message: unknown) => Promise<void>
    }).handleClusterMessage(link, {
      type: 'clusterHeartbeatAck',
      clusterId: 'cluster-local',
      serverId: 'node-b',
      term: 1,
      followerId: 'node-b',
      leaderId: 'node-a',
      timestamp: Date.now()
    })

    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({
      roleChanged: false,
      leaderChanged: false,
      state: expect.objectContaining({
        knownMemberCount: 2,
        reachableMemberCount: 2,
        hasQuorum: true
      })
    }))
  })

  it('emits a state change when a control link closes and quorum drops', () => {
    const onStateChange = vi.fn()
    const manager = createManager(onStateChange)
    const link = createLink()

    setLeaderState(manager)
    setPeerState(manager, link, {
      attachLink: true,
      lastSeenAt: Date.now()
    })
    ;(manager as unknown as {
      links: Set<unknown>
    }).links.add(link)
    ;(manager as unknown as {
      unregisterLink: (link: unknown) => void
    }).unregisterLink(link)

    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({
      roleChanged: false,
      leaderChanged: false,
      state: expect.objectContaining({
        knownMemberCount: 2,
        reachableMemberCount: 1,
        hasQuorum: false
      })
    }))
  })
})

function createManager(onStateChange: (event: unknown) => void): MdpClusterManager {
  return new MdpClusterManager({
    serverId: 'node-a',
    clusterId: 'cluster-local',
    clusterMode: 'auto',
    clusterMembers: ['node-a', 'node-b'],
    discoverHost: '127.0.0.1',
    discoverStartPort: 47372,
    discoverAttempts: 1,
    heartbeatIntervalMs: 40,
    leaseDurationMs: 140,
    electionTimeoutMinMs: 180,
    electionTimeoutMaxMs: 260,
    discoveryIntervalMs: 60,
    getSelfEndpoints: () => ({
      ws: 'ws://127.0.0.1:47372',
      cluster: 'ws://127.0.0.1:47372/mdp/cluster'
    }),
    onStateChange
  })
}

function setLeaderState(manager: MdpClusterManager): void {
  const mutable = manager as unknown as {
    currentTerm: number
    role: 'leader'
    leaderId: string
    leaderUrl: string
  }

  mutable.currentTerm = 1
  mutable.role = 'leader'
  mutable.leaderId = 'node-a'
  mutable.leaderUrl = 'ws://127.0.0.1:47372'
}

function setPeerState(
  manager: MdpClusterManager,
  link: unknown,
  options: {
    attachLink: boolean
    lastSeenAt: number
  }
): void {
  const mutable = manager as unknown as {
    peers: Map<string, {
      serverId: string
      wsUrl: string
      clusterUrl: string
      role: 'follower'
      term: number
      lastSeenAt: number
      links: Set<unknown>
      outboundOpen: boolean
      connectPromise: Promise<void> | undefined
    }>
  }

  mutable.peers.set('node-b', {
    serverId: 'node-b',
    wsUrl: 'ws://127.0.0.1:47373',
    clusterUrl: 'ws://127.0.0.1:47373/mdp/cluster',
    role: 'follower',
    term: 1,
    lastSeenAt: options.lastSeenAt,
    links: options.attachLink ? new Set([link]) : new Set(),
    outboundOpen: options.attachLink,
    connectPromise: undefined
  })
}

function createLink(): {
  socket: Pick<WebSocket, 'close' | 'once' | 'readyState' | 'send'>
  outbound: boolean
  peerId: string
} {
  let onClose: (() => void) | undefined

  return {
    socket: {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      once: vi.fn((event: string, handler: () => void) => {
        if (event === 'close') {
          onClose = handler
        }
      }),
      close: vi.fn(function(this: { readyState: number }) {
        this.readyState = WebSocket.CLOSED
        onClose?.()
      })
    },
    outbound: true,
    peerId: 'node-b'
  }
}
