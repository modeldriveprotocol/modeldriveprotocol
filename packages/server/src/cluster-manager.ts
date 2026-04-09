import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import {
  type ClusterHeartbeatAckMessage,
  type ClusterHeartbeatMessage,
  type ClusterHelloMessage,
  type ClusterLeaderResignMessage,
  type ClusterMessage,
  type ClusterRole,
  type ClusterRpcRequestMessage,
  type ClusterRpcResponseMessage,
  type ClusterVoteRequestMessage,
  type ClusterVoteResponseMessage,
  type JsonValue,
  createSerializedError,
  parseClusterMessage
} from '@modeldriveprotocol/protocol'
import WebSocket from 'ws'

import {
  DEFAULT_CLUSTER_DISCOVERY_INTERVAL_MS,
  DEFAULT_CLUSTER_ELECTION_TIMEOUT_MAX_MS,
  DEFAULT_CLUSTER_ELECTION_TIMEOUT_MIN_MS,
  DEFAULT_CLUSTER_HEARTBEAT_INTERVAL_MS,
  DEFAULT_CLUSTER_LEASE_DURATION_MS
} from './defaults.js'
import { type DiscoveredMdpServer, discoverMdpServers, probeMdpServer } from './upstream-discovery.js'

export class DuplicateClusterServerIdError extends Error {
  readonly name = 'DuplicateClusterServerIdError'

  constructor(
    readonly clusterId: string,
    readonly serverId: string,
    readonly endpoint: string
  ) {
    super(
      `Discovered duplicate server id ${serverId} at ${endpoint} in cluster ${clusterId}. Server ids must be unique within a cluster.`
    )
  }
}

export class IncompatibleClusterMembershipError extends Error {
  readonly name = 'IncompatibleClusterMembershipError'

  constructor(
    readonly clusterId: string,
    readonly serverId: string,
    readonly expected: {
      membershipMode: 'dynamic' | 'static'
      membershipFingerprint: string
    },
    readonly received: {
      membershipMode: 'dynamic' | 'static'
      membershipFingerprint: string
    }
  ) {
    super(
      [
        `Cluster peer ${serverId} in cluster ${clusterId} advertises incompatible membership settings.`,
        `Expected ${expected.membershipMode}:${expected.membershipFingerprint}.`,
        `Received ${received.membershipMode}:${received.membershipFingerprint}.`
      ].join(' ')
    )
  }
}

export interface ClusterManagerState {
  id: string
  membershipMode: 'dynamic' | 'static'
  membershipFingerprint: string
  role: ClusterRole
  term: number
  leaderId?: string
  leaderUrl?: string
  leaseDurationMs: number
  knownMemberCount: number
  reachableMemberCount: number
  quorumSize: number
  hasQuorum: boolean
}

export interface ClusterManagerStateChangeEvent {
  state: ClusterManagerState
  leaderChanged: boolean
  roleChanged: boolean
}

export interface ClusterManagerOptions {
  serverId: string
  clusterId: string
  clusterMode: 'auto' | 'proxy-required'
  clusterMembers?: string[]
  discoverHost: string
  discoverStartPort: number
  discoverAttempts: number
  seedUrls?: string[]
  heartbeatIntervalMs?: number
  leaseDurationMs?: number
  electionTimeoutMinMs?: number
  electionTimeoutMaxMs?: number
  discoveryIntervalMs?: number
  getSelfEndpoints: () => {
    ws: string
    cluster: string
  }
  handleRpcRequest?: (request: ClusterRpcRequest) => Promise<unknown>
  onStateChange?: (event: ClusterManagerStateChangeEvent) => void
}

export interface ClusterRpcRequest {
  method: string
  params?: unknown
}

interface ClusterPeerState {
  serverId: string
  wsUrl: string
  clusterUrl: string
  role: ClusterRole
  term: number
  lastSeenAt: number
  links: Set<ClusterPeerLink>
  outboundOpen: boolean
  connectPromise: Promise<void> | undefined
}

interface ClusterPeerLink {
  socket: WebSocket
  outbound: boolean
  peerId?: string
}

interface PendingRpcRequest {
  link: ClusterPeerLink
  timeout: NodeJS.Timeout
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

const RPC_TIMEOUT_MS = 15_000

export class MdpClusterManager {
  private readonly serverId: string
  private readonly clusterId: string
  private readonly clusterMode: 'auto' | 'proxy-required'
  private readonly configuredMemberIds: Set<string> | undefined
  private readonly discoverHost: string
  private readonly discoverStartPort: number
  private readonly discoverAttempts: number
  private readonly seedUrls: string[]
  private readonly heartbeatIntervalMs: number
  private readonly leaseDurationMs: number
  private readonly electionTimeoutMinMs: number
  private readonly electionTimeoutMaxMs: number
  private readonly discoveryIntervalMs: number
  private readonly getSelfEndpoints: ClusterManagerOptions['getSelfEndpoints']
  private readonly handleRpcRequest: ClusterManagerOptions['handleRpcRequest']
  private readonly onStateChange: ClusterManagerOptions['onStateChange']
  private readonly peers = new Map<string, ClusterPeerState>()
  private readonly memberIds = new Set<string>()
  private readonly links = new Set<ClusterPeerLink>()
  private readonly pendingRpcRequests = new Map<string, PendingRpcRequest>()
  private currentTerm = 0
  private role: ClusterRole = 'follower'
  private leaderId: string | undefined
  private leaderUrl: string | undefined
  private votedFor: string | undefined
  private leaderLeaseExpiresAt = 0
  private electionTimer: NodeJS.Timeout | undefined
  private heartbeatTimer: NodeJS.Timeout | undefined
  private discoveryTimer: NodeJS.Timeout | undefined
  private stateObservationTimer: NodeJS.Timeout | undefined
  private activeElectionVotes = new Set<string>()
  private closed = false
  private observedState: ClusterManagerState

  constructor(options: ClusterManagerOptions) {
    this.serverId = options.serverId
    this.clusterId = options.clusterId
    this.clusterMode = options.clusterMode
    this.configuredMemberIds = options.clusterMembers && options.clusterMembers.length > 0
      ? new Set([...options.clusterMembers, this.serverId])
      : undefined
    this.discoverHost = options.discoverHost
    this.discoverStartPort = options.discoverStartPort
    this.discoverAttempts = options.discoverAttempts
    this.seedUrls = [...new Set(options.seedUrls ?? [])]
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULT_CLUSTER_HEARTBEAT_INTERVAL_MS
    this.leaseDurationMs = options.leaseDurationMs ?? DEFAULT_CLUSTER_LEASE_DURATION_MS
    this.electionTimeoutMinMs = options.electionTimeoutMinMs ?? DEFAULT_CLUSTER_ELECTION_TIMEOUT_MIN_MS
    this.electionTimeoutMaxMs = options.electionTimeoutMaxMs ?? DEFAULT_CLUSTER_ELECTION_TIMEOUT_MAX_MS
    this.discoveryIntervalMs = options.discoveryIntervalMs ?? DEFAULT_CLUSTER_DISCOVERY_INTERVAL_MS
    this.getSelfEndpoints = options.getSelfEndpoints
    this.handleRpcRequest = options.handleRpcRequest
    this.onStateChange = options.onStateChange
    if (this.configuredMemberIds) {
      for (const memberId of this.configuredMemberIds) {
        this.memberIds.add(memberId)
      }
    } else {
      this.memberIds.add(this.serverId)
    }

    this.observedState = this.state
    this.scheduleStateObservation()
  }

  get state(): ClusterManagerState {
    const reachableMemberCount = this.reachableMemberCount()
    const quorumSize = this.quorumSize()

    return {
      id: this.clusterId,
      membershipMode: this.membershipMode(),
      membershipFingerprint: this.membershipFingerprint(),
      role: this.role,
      term: this.currentTerm,
      ...(this.leaderId ? { leaderId: this.leaderId } : {}),
      ...(this.leaderUrl ? { leaderUrl: this.leaderUrl } : {}),
      leaseDurationMs: this.leaseDurationMs,
      knownMemberCount: this.memberIds.size,
      reachableMemberCount,
      quorumSize,
      hasQuorum: reachableMemberCount >= quorumSize
    }
  }

  async start(): Promise<void> {
    await this.refreshPeers()

    if (
      this.clusterMode === 'proxy-required' &&
      !this.currentLeaderPeer() &&
      !this.hasRemotePeers()
    ) {
      throw new Error(
        `Unable to discover an upstream MDP server from ${this.discoverHost}:${this.discoverStartPort} within ${this.discoverAttempts} ports`
      )
    }

    this.scheduleElection()
    this.discoveryTimer = setInterval(() => {
      void this.refreshPeers()
    }, this.discoveryIntervalMs)
  }

  async close(): Promise<void> {
    this.closed = true
    this.stopElectionTimer()
    this.stopHeartbeatTimer()
    this.stopStateObservationTimer()
    this.rejectPendingRpcRequests(new Error('Cluster manager closed'))

    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer)
      this.discoveryTimer = undefined
    }

    if (this.role === 'leader') {
      this.broadcast(
        {
          type: 'clusterLeaderResign',
          clusterId: this.clusterId,
          serverId: this.serverId,
          term: this.currentTerm,
          leaderId: this.serverId,
          timestamp: Date.now()
        } satisfies ClusterLeaderResignMessage
      )

      await delay(50)
    }

    await Promise.allSettled(
      [...this.links].map((link) => closeLink(link))
    )
    this.links.clear()
    this.peers.clear()
  }

  async requestLeaderRpc(request: ClusterRpcRequest): Promise<unknown> {
    const leaderPeer = this.currentLeaderPeer()

    if (!leaderPeer || !this.leaderId || !this.leaderUrl) {
      throw new Error('No cluster leader is currently available for RPC forwarding')
    }

    await this.ensurePeerConnection(leaderPeer)
    const link = this.findOpenLink(leaderPeer)

    if (!link) {
      throw new Error(`Unable to open a cluster control link to leader ${this.leaderId}`)
    }

    const requestId = randomUUID()

    return new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRpcRequests.delete(requestId)
        reject(new Error(`Cluster RPC "${request.method}" timed out while waiting for leader ${this.leaderId}`))
      }, RPC_TIMEOUT_MS)

      this.pendingRpcRequests.set(requestId, {
        link,
        timeout,
        resolve,
        reject
      })

      try {
        this.send(
          link,
          {
            type: 'clusterRpcRequest',
            clusterId: this.clusterId,
            serverId: this.serverId,
            term: this.currentTerm,
            requestId,
            method: request.method,
            timestamp: Date.now(),
            ...(request.params !== undefined ? { params: request.params as JsonValue } : {})
          } satisfies ClusterRpcRequestMessage
        )
      } catch (error) {
        clearTimeout(timeout)
        this.pendingRpcRequests.delete(requestId)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  handleConnection(socket: WebSocket): void {
    const link: ClusterPeerLink = {
      socket,
      outbound: false
    }

    this.registerLink(link)
    this.sendHello(link)
  }

  private async refreshPeers(): Promise<void> {
    if (this.closed) {
      return
    }

    const now = Date.now()
    const discovered = await this.discoverPeers()

    for (const server of discovered) {
      this.assertNoDuplicateServerId(server)

      if (this.isSelfServer(server)) {
        continue
      }

      if (!this.isEligibleMember(server.meta.serverId)) {
        continue
      }

      this.assertCompatibleMembership(server)

      const peer = this.upsertPeer(server, now)
      if (server.meta.cluster.role === 'leader') {
        this.observeLeader(server.meta.serverId, server.url, server.meta.cluster.term, 'discovery')
      }
      void this.ensurePeerConnection(peer)
    }
  }

  private async discoverPeers(): Promise<DiscoveredMdpServer[]> {
    const discovered = await discoverMdpServers({
      requiredClusterId: this.clusterId,
      host: this.discoverHost,
      startPort: this.discoverStartPort,
      attempts: this.discoverAttempts
    })

    const byServerId = new Map<string, DiscoveredMdpServer>()

    for (const server of discovered) {
      this.assertNoDuplicateServerId(server)
      this.assertNoPeerServerIdCollision(byServerId, server)
      byServerId.set(server.meta.serverId, server)
    }

    for (const seedUrl of this.seedUrls) {
      const server = await probeMdpServer(seedUrl, {
        requiredClusterId: this.clusterId
      })
      if (server) {
        this.assertNoDuplicateServerId(server)
        if (!this.isEligibleMember(server.meta.serverId)) {
          throw new Error(
            `Discovered seed peer ${server.meta.serverId} is not part of the configured cluster membership`
          )
        }
        this.assertCompatibleMembership(server)
        this.assertNoPeerServerIdCollision(byServerId, server)
        byServerId.set(server.meta.serverId, server)
      }
    }

    return [...byServerId.values()]
  }

  private upsertPeer(
    server: DiscoveredMdpServer,
    now: number
  ): ClusterPeerState {
    const previous = this.state
    const existing = this.peers.get(server.meta.serverId)

    if (existing) {
      existing.wsUrl = server.url
      existing.clusterUrl = server.meta.endpoints.cluster
      existing.role = server.meta.cluster.role
      existing.term = server.meta.cluster.term
      existing.lastSeenAt = now
      this.emitStateChangeIfChanged(previous)
      return existing
    }

    const peer: ClusterPeerState = {
      serverId: server.meta.serverId,
      wsUrl: server.url,
      clusterUrl: server.meta.endpoints.cluster,
      role: server.meta.cluster.role,
      term: server.meta.cluster.term,
      lastSeenAt: now,
      links: new Set(),
      outboundOpen: false,
      connectPromise: undefined
    }
    this.memberIds.add(peer.serverId)
    this.peers.set(peer.serverId, peer)
    this.emitStateChangeIfChanged(previous)
    return peer
  }

  private async ensurePeerConnection(peer: ClusterPeerState): Promise<void> {
    if (peer.outboundOpen || peer.connectPromise || this.closed) {
      return
    }

    peer.connectPromise = this.openPeerConnection(peer)
      .finally(() => {
        peer.connectPromise = undefined
      })

    await peer.connectPromise
  }

  private async openPeerConnection(peer: ClusterPeerState): Promise<void> {
    const socket = new WebSocket(peer.clusterUrl)
    const link: ClusterPeerLink = {
      socket,
      outbound: true,
      peerId: peer.serverId
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false

      const resolveOnce = () => {
        if (settled) {
          return
        }
        settled = true
        resolve()
      }

      const rejectOnce = (error: Error) => {
        if (settled) {
          return
        }
        settled = true
        reject(error)
      }

      socket.once('open', () => {
        peer.outboundOpen = true
        this.registerLink(link)
        this.sendHello(link)
        resolveOnce()
      })

      socket.once('error', (error) => {
        rejectOnce(
          error instanceof Error
            ? error
            : new Error(`Unable to connect to cluster peer ${peer.clusterUrl}`)
        )
      })
    }).catch(() => {})
  }

  private registerLink(link: ClusterPeerLink): void {
    this.links.add(link)

    link.socket.on('message', (payload, isBinary) => {
      if (isBinary) {
        link.socket.close(1003, 'Binary frames are not supported')
        return
      }

      try {
        const message = parseClusterMessage(payload.toString())
        void this.handleClusterMessage(link, message)
      } catch {
        link.socket.close(1008, 'Invalid cluster message')
      }
    })

    link.socket.on('close', () => {
      this.unregisterLink(link)
    })

    link.socket.on('error', () => {
      this.unregisterLink(link)
    })
  }

  private unregisterLink(link: ClusterPeerLink): void {
    if (!this.links.delete(link)) {
      return
    }

    const previous = this.state
    const peerId = link.peerId
    if (peerId) {
      const peer = this.peers.get(peerId)
      if (peer) {
        peer.links.delete(link)
        if (link.outbound) {
          peer.outboundOpen = false
        }
      }

      if (peerId === this.leaderId) {
        this.rejectPendingRpcRequests(
          new Error(`Cluster control link to leader ${peerId} closed`),
          link
        )
      }
    }

    this.emitStateChangeIfChanged(previous)
  }

  private async handleClusterMessage(
    link: ClusterPeerLink,
    message: ClusterMessage
  ): Promise<void> {
    if (!this.isEligibleMember(message.serverId)) {
      link.socket.close(1008, 'Cluster peer is not in the configured membership')
      return
    }

    if (message.clusterId !== this.clusterId) {
      link.socket.close(1008, 'Cluster peer belongs to a different cluster')
      return
    }

    if (
      message.type === 'clusterHello' &&
      !this.isCompatibleMembershipDescriptor({
        membershipMode: message.membershipMode,
        membershipFingerprint: message.membershipFingerprint
      })
    ) {
      link.socket.close(1008, 'Cluster peer advertises incompatible membership settings')
      return
    }

    if (message.serverId === this.serverId) {
      link.socket.close(1008, 'Duplicate server id detected in cluster control channel')
      return
    }

    const now = Date.now()
    const peer = this.upsertPeerFromMessage(link, message, now)

    switch (message.type) {
      case 'clusterHello':
        if (message.role === 'leader') {
          this.observeLeader(message.serverId, message.wsUrl, message.term, 'control')
        } else if (message.term > this.currentTerm) {
          this.stepDown(message.term)
        }
        return
      case 'clusterHeartbeat':
        this.observeLeader(message.leaderId, message.leaderUrl, message.term, 'control')
        this.leaderLeaseExpiresAt = Date.now() + message.leaseDurationMs
        this.send(
          link,
          {
            type: 'clusterHeartbeatAck',
            clusterId: this.clusterId,
            serverId: this.serverId,
            term: this.currentTerm,
            followerId: this.serverId,
            leaderId: message.leaderId,
            timestamp: Date.now()
          } satisfies ClusterHeartbeatAckMessage
        )
        return
      case 'clusterHeartbeatAck':
        if (this.role === 'leader' && message.term === this.currentTerm && message.leaderId === this.serverId) {
          const follower = this.peers.get(message.followerId)
          if (follower) {
            follower.lastSeenAt = now
          }
        }
        return
      case 'clusterVoteRequest':
        this.handleVoteRequest(link, peer, message)
        return
      case 'clusterVoteResponse':
        this.handleVoteResponse(message)
        return
      case 'clusterLeaderResign':
        this.handleLeaderResign(message)
        return
      case 'clusterRpcRequest':
        await this.handleRpcRequestMessage(link, message)
        return
      case 'clusterRpcResponse':
        this.handleRpcResponse(message)
        return
    }
  }

  private upsertPeerFromMessage(
    link: ClusterPeerLink,
    message: ClusterMessage,
    now: number
  ): ClusterPeerState {
    const previous = this.state
    const peer = this.peers.get(message.serverId) ?? {
      serverId: message.serverId,
      wsUrl: resolvePeerWsUrl(message),
      clusterUrl: resolvePeerClusterUrl(message),
      role: 'follower' as ClusterRole,
      term: 0,
      lastSeenAt: now,
      links: new Set<ClusterPeerLink>(),
      outboundOpen: false,
      connectPromise: undefined
    }

    peer.lastSeenAt = now
    peer.term = message.term
    peer.role = inferPeerRole(message, peer.role)
    const wsUrl = resolvePeerWsUrl(message)
    if (wsUrl) {
      peer.wsUrl = wsUrl
    }
    const clusterUrl = resolvePeerClusterUrl(message)
    if (clusterUrl) {
      peer.clusterUrl = clusterUrl
    }

    peer.links.add(link)
    link.peerId = peer.serverId
    this.memberIds.add(peer.serverId)
    this.peers.set(peer.serverId, peer)
    this.emitStateChangeIfChanged(previous)

    return peer
  }

  private handleVoteRequest(
    link: ClusterPeerLink,
    _peer: ClusterPeerState,
    message: ClusterVoteRequestMessage
  ): void {
    if (message.term < this.currentTerm) {
      this.send(link, this.buildVoteResponse(false))
      return
    }

    if (message.term > this.currentTerm) {
      this.stepDown(message.term)
      this.votedFor = undefined
    }

    if (
      this.hasActiveLeaderLease() &&
      this.leaderId !== message.candidateId
    ) {
      this.send(link, this.buildVoteResponse(false))
      return
    }

    if (this.votedFor && this.votedFor !== message.candidateId) {
      this.send(link, this.buildVoteResponse(false))
      return
    }

    this.votedFor = message.candidateId
    this.scheduleElection()
    this.send(link, this.buildVoteResponse(true))
  }

  private handleVoteResponse(message: ClusterVoteResponseMessage): void {
    if (message.term > this.currentTerm) {
      this.stepDown(message.term)
      return
    }

    if (this.role !== 'candidate' || message.term !== this.currentTerm) {
      return
    }

    if (!message.voteGranted) {
      if (message.leaderId && message.leaderUrl) {
        this.observeLeader(message.leaderId, message.leaderUrl, message.term, 'control')
      }
      return
    }

    this.activeElectionVotes.add(message.voterId)

    if (this.activeElectionVotes.size >= this.quorumSize()) {
      this.becomeLeader()
    }
  }

  private handleLeaderResign(message: ClusterLeaderResignMessage): void {
    if (message.term > this.currentTerm) {
      this.stepDown(message.term)
    }

    if (this.leaderId !== message.leaderId) {
      return
    }

    this.clearLeader()
    this.scheduleElection(true)
  }

  private async handleRpcRequestMessage(
    link: ClusterPeerLink,
    message: ClusterRpcRequestMessage
  ): Promise<void> {
    if (message.term > this.currentTerm) {
      this.stepDown(message.term)
    }

    if (this.role !== 'leader') {
      this.send(
        link,
        {
          type: 'clusterRpcResponse',
          clusterId: this.clusterId,
          serverId: this.serverId,
          term: this.currentTerm,
          requestId: message.requestId,
          ok: false,
          error: createSerializedError(
            'not_ready',
            `Server ${this.serverId} is not the current cluster leader`
          ),
          timestamp: Date.now()
        } satisfies ClusterRpcResponseMessage
      )
      return
    }

    if (!this.handleRpcRequest) {
      this.send(
        link,
        {
          type: 'clusterRpcResponse',
          clusterId: this.clusterId,
          serverId: this.serverId,
          term: this.currentTerm,
          requestId: message.requestId,
          ok: false,
          error: createSerializedError(
            'not_ready',
            `Server ${this.serverId} does not accept forwarded cluster RPC requests`
          ),
          timestamp: Date.now()
        } satisfies ClusterRpcResponseMessage
      )
      return
    }

    try {
      const result = await this.handleRpcRequest({
        method: message.method,
        ...(message.params !== undefined ? { params: message.params } : {})
      })

      this.send(
        link,
        {
          type: 'clusterRpcResponse',
          clusterId: this.clusterId,
          serverId: this.serverId,
          term: this.currentTerm,
          requestId: message.requestId,
          ok: true,
          ...(result !== undefined ? { result: result as JsonValue } : {}),
          timestamp: Date.now()
        } satisfies ClusterRpcResponseMessage
      )
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))

      this.send(
        link,
        {
          type: 'clusterRpcResponse',
          clusterId: this.clusterId,
          serverId: this.serverId,
          term: this.currentTerm,
          requestId: message.requestId,
          ok: false,
          error: createSerializedError('handler_error', normalized.message),
          timestamp: Date.now()
        } satisfies ClusterRpcResponseMessage
      )
    }
  }

  private handleRpcResponse(message: ClusterRpcResponseMessage): void {
    const pending = this.pendingRpcRequests.get(message.requestId)

    if (!pending) {
      return
    }

    clearTimeout(pending.timeout)
    this.pendingRpcRequests.delete(message.requestId)

    if (!message.ok) {
      pending.reject(new Error(message.error?.message ?? 'Cluster RPC failed'))
      return
    }

    pending.resolve(message.result ?? null)
  }

  private buildVoteResponse(voteGranted: boolean): ClusterVoteResponseMessage {
    return {
      type: 'clusterVoteResponse',
      clusterId: this.clusterId,
      serverId: this.serverId,
      term: this.currentTerm,
      voterId: this.serverId,
      voteGranted,
      timestamp: Date.now(),
      ...(this.leaderId ? { leaderId: this.leaderId } : {}),
      ...(this.leaderUrl ? { leaderUrl: this.leaderUrl } : {})
    }
  }

  private observeLeader(
    serverId: string,
    wsUrl: string,
    term: number,
    source: 'control' | 'discovery'
  ): void {
    if (serverId === this.serverId) {
      if (this.role !== 'leader') {
        this.becomeLeader()
      }
      return
    }

    const previous = this.state
    const sameLeader = this.leaderId === serverId

    if (
      source === 'discovery' &&
      !sameLeader &&
      term <= this.currentTerm &&
      (this.role === 'leader' || this.hasActiveLeaderLease())
    ) {
      return
    }

    if (term > this.currentTerm) {
      this.stepDown(term)
    } else if (term < this.currentTerm) {
      return
    }

    this.role = 'follower'
    this.leaderId = serverId
    this.leaderUrl = wsUrl
    this.leaderLeaseExpiresAt = Date.now() + this.leaseDurationMs
    this.stopHeartbeatTimer()
    this.scheduleElection()
    this.emitStateChange(previous)
  }

  private startElection(): void {
    if (this.closed || this.hasActiveLeaderLease() || this.role === 'leader') {
      this.scheduleElection()
      return
    }

    const previous = this.state
    this.currentTerm += 1
    this.role = 'candidate'
    this.leaderId = undefined
    this.leaderUrl = undefined
    this.leaderLeaseExpiresAt = 0
    this.votedFor = this.serverId
    this.activeElectionVotes = new Set([this.serverId])
    this.emitStateChange(previous)

    if (this.activeElectionVotes.size >= this.quorumSize()) {
      this.becomeLeader()
      return
    }

    const message: ClusterVoteRequestMessage = {
      type: 'clusterVoteRequest',
      clusterId: this.clusterId,
      serverId: this.serverId,
      term: this.currentTerm,
      candidateId: this.serverId,
      candidateUrl: this.getSelfEndpoints().ws,
      timestamp: Date.now()
    }

    this.broadcast(message)
    this.scheduleElection()
  }

  private becomeLeader(): void {
    const previous = this.state
    this.role = 'leader'
    this.leaderId = this.serverId
    this.leaderUrl = this.getSelfEndpoints().ws
    this.leaderLeaseExpiresAt = Date.now() + this.leaseDurationMs
    this.votedFor = this.serverId
    this.stopElectionTimer()
    this.emitStateChange(previous)
    this.sendHeartbeats()
    this.startHeartbeatTimer()
  }

  private stepDown(term: number): void {
    const previous = this.state
    this.currentTerm = term
    this.role = 'follower'
    this.leaderId = undefined
    this.leaderUrl = undefined
    this.leaderLeaseExpiresAt = 0
    this.votedFor = undefined
    this.activeElectionVotes.clear()
    this.stopHeartbeatTimer()
    this.emitStateChange(previous)
  }

  private clearLeader(): void {
    const previous = this.state
    this.leaderId = undefined
    this.leaderUrl = undefined
    this.leaderLeaseExpiresAt = 0
    this.emitStateChange(previous)
  }

  private relinquishLeadership(): void {
    const previous = this.state
    this.role = 'follower'
    this.leaderId = undefined
    this.leaderUrl = undefined
    this.leaderLeaseExpiresAt = 0
    this.votedFor = undefined
    this.activeElectionVotes.clear()
    this.stopHeartbeatTimer()
    this.scheduleElection()
    this.emitStateChange(previous)
  }

  private startHeartbeatTimer(): void {
    this.stopHeartbeatTimer()
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeats()
    }, this.heartbeatIntervalMs)
  }

  private stopHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  private stopStateObservationTimer(): void {
    if (this.stateObservationTimer) {
      clearTimeout(this.stateObservationTimer)
      this.stateObservationTimer = undefined
    }
  }

  private sendHeartbeats(): void {
    if (this.role !== 'leader') {
      return
    }

    if (!this.hasLeaderQuorum()) {
      this.relinquishLeadership()
      return
    }

    this.leaderLeaseExpiresAt = Date.now() + this.leaseDurationMs
    this.broadcast(
      {
        type: 'clusterHeartbeat',
        clusterId: this.clusterId,
        serverId: this.serverId,
        term: this.currentTerm,
        leaderId: this.serverId,
        leaderUrl: this.getSelfEndpoints().ws,
        leaseDurationMs: this.leaseDurationMs,
        timestamp: Date.now()
      } satisfies ClusterHeartbeatMessage
    )
  }

  private scheduleElection(immediate = false): void {
    if (this.closed || this.role === 'leader') {
      return
    }

    this.stopElectionTimer()

    const timeout = immediate
      ? 0
      : this.randomElectionTimeout()

    this.electionTimer = setTimeout(() => {
      this.startElection()
    }, timeout)
  }

  private stopElectionTimer(): void {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer)
      this.electionTimer = undefined
    }
  }

  private randomElectionTimeout(): number {
    const min = Math.min(this.electionTimeoutMinMs, this.electionTimeoutMaxMs)
    const max = Math.max(this.electionTimeoutMinMs, this.electionTimeoutMaxMs)
    return min + Math.floor(Math.random() * (max - min + 1))
  }

  private hasActiveLeaderLease(): boolean {
    return (
      this.leaderId !== undefined &&
      this.leaderId !== this.serverId &&
      Date.now() < this.leaderLeaseExpiresAt
    )
  }

  private quorumSize(): number {
    const memberCount = this.memberIds.size
    return Math.floor(memberCount / 2) + 1
  }

  private hasLeaderQuorum(): boolean {
    return this.reachableMemberCount() >= this.quorumSize()
  }

  private reachableMemberCount(): number {
    const now = Date.now()
    let count = 1

    for (const peerId of this.memberIds) {
      if (peerId === this.serverId) {
        continue
      }

      const peer = this.peers.get(peerId)
      if (!peer) {
        continue
      }

      if (
        firstOpenLink(peer.links) &&
        now - peer.lastSeenAt <= this.leaseDurationMs
      ) {
        count += 1
      }
    }

    return count
  }

  private activePeerCount(): number {
    const staleAfterMs = Math.max(this.discoveryIntervalMs * 3, this.leaseDurationMs * 2)
    const now = Date.now()
    let count = 0

    for (const peer of this.peers.values()) {
      if (now - peer.lastSeenAt <= staleAfterMs) {
        count += 1
      }
    }

    return count
  }

  private currentLeaderPeer(): ClusterPeerState | undefined {
    if (!this.leaderId || this.leaderId === this.serverId) {
      return undefined
    }

    return this.peers.get(this.leaderId)
  }

  private findOpenLink(peer: ClusterPeerState): ClusterPeerLink | undefined {
    for (const link of peer.links) {
      if (link.socket.readyState === WebSocket.OPEN) {
        return link
      }
    }

    return undefined
  }

  private hasRemotePeers(): boolean {
    return this.activePeerCount() > 0
  }

  private rejectPendingRpcRequests(error: Error, link?: ClusterPeerLink): void {
    for (const [requestId, pending] of this.pendingRpcRequests.entries()) {
      if (link && pending.link !== link) {
        continue
      }

      clearTimeout(pending.timeout)
      this.pendingRpcRequests.delete(requestId)
      pending.reject(error)
    }
  }

  private membershipMode(): 'dynamic' | 'static' {
    return this.configuredMemberIds ? 'static' : 'dynamic'
  }

  private membershipFingerprint(): string {
    if (!this.configuredMemberIds) {
      return 'dynamic'
    }

    return JSON.stringify([...this.configuredMemberIds].sort())
  }

  private isEligibleMember(serverId: string): boolean {
    return this.configuredMemberIds?.has(serverId) ?? true
  }

  private isCompatibleMembershipDescriptor(descriptor: {
    membershipMode: 'dynamic' | 'static'
    membershipFingerprint: string
  }): boolean {
    return (
      descriptor.membershipMode === this.membershipMode() &&
      (
        descriptor.membershipMode === 'dynamic' ||
        descriptor.membershipFingerprint === this.membershipFingerprint()
      )
    )
  }

  private isSelfServer(server: DiscoveredMdpServer): boolean {
    const selfEndpoints = this.getSelfEndpoints()

    return (
      server.meta.serverId === this.serverId &&
      (
        normalizeUrl(server.meta.endpoints.ws) === normalizeUrl(selfEndpoints.ws) ||
        normalizeUrl(server.meta.endpoints.cluster) === normalizeUrl(selfEndpoints.cluster)
      )
    )
  }

  private assertNoDuplicateServerId(server: DiscoveredMdpServer): void {
    if (
      server.meta.serverId === this.serverId &&
      !this.isSelfServer(server)
    ) {
      throw new DuplicateClusterServerIdError(
        this.clusterId,
        this.serverId,
        server.meta.endpoints.ws
      )
    }
  }

  private assertNoPeerServerIdCollision(
    byServerId: Map<string, DiscoveredMdpServer>,
    server: DiscoveredMdpServer
  ): void {
    const existing = byServerId.get(server.meta.serverId)

    if (!existing) {
      return
    }

    if (normalizeUrl(existing.meta.endpoints.ws) === normalizeUrl(server.meta.endpoints.ws)) {
      return
    }

    throw new DuplicateClusterServerIdError(
      this.clusterId,
      server.meta.serverId,
      server.meta.endpoints.ws
    )
  }

  private assertCompatibleMembership(server: DiscoveredMdpServer): void {
    const received = {
      membershipMode: server.meta.cluster.membershipMode,
      membershipFingerprint: server.meta.cluster.membershipFingerprint
    } as const

    if (this.isCompatibleMembershipDescriptor(received)) {
      return
    }

    throw new IncompatibleClusterMembershipError(
      this.clusterId,
      server.meta.serverId,
      {
        membershipMode: this.membershipMode(),
        membershipFingerprint: this.membershipFingerprint()
      },
      received
    )
  }

  private sendHello(link: ClusterPeerLink): void {
    this.send(
      link,
      {
        type: 'clusterHello',
        clusterId: this.clusterId,
        membershipMode: this.membershipMode(),
        membershipFingerprint: this.membershipFingerprint(),
        serverId: this.serverId,
        term: this.currentTerm,
        role: this.role,
        wsUrl: this.getSelfEndpoints().ws,
        clusterUrl: this.getSelfEndpoints().cluster,
        timestamp: Date.now(),
        ...(this.leaderId ? { leaderId: this.leaderId } : {}),
        ...(this.leaderUrl ? { leaderUrl: this.leaderUrl } : {})
      } satisfies ClusterHelloMessage
    )
  }

  private broadcast(message: ClusterMessage): void {
    for (const peer of this.peers.values()) {
      const link = firstOpenLink(peer.links)
      if (link) {
        this.send(link, message)
      }
    }
  }

  private send(link: ClusterPeerLink, message: ClusterMessage): void {
    if (link.socket.readyState !== WebSocket.OPEN) {
      return
    }

    link.socket.send(JSON.stringify(message))
  }

  private emitStateChange(previous: ClusterManagerState): void {
    const next = this.state

    this.observedState = next
    this.scheduleStateObservation()

    this.onStateChange?.({
      state: next,
      leaderChanged: previous.leaderId !== next.leaderId || previous.leaderUrl !== next.leaderUrl,
      roleChanged: previous.role !== next.role
    })
  }

  private emitStateChangeIfChanged(previous: ClusterManagerState): void {
    if (clusterStatesEqual(previous, this.state)) {
      this.scheduleStateObservation()
      return
    }

    this.emitStateChange(previous)
  }

  private scheduleStateObservation(): void {
    this.stopStateObservationTimer()

    if (this.closed) {
      return
    }

    const delayMs = this.nextStateObservationDelayMs()

    if (delayMs === undefined) {
      return
    }

    this.stateObservationTimer = setTimeout(() => {
      this.stateObservationTimer = undefined

      if (clusterStatesEqual(this.observedState, this.state)) {
        this.scheduleStateObservation()
        return
      }

      this.emitStateChange(this.observedState)
    }, delayMs)
    this.stateObservationTimer.unref?.()
  }

  private nextStateObservationDelayMs(): number | undefined {
    const now = Date.now()
    let nextDeadline: number | undefined

    for (const peer of this.peers.values()) {
      if (!firstOpenLink(peer.links)) {
        continue
      }

      const deadline = peer.lastSeenAt + this.leaseDurationMs + 1

      if (deadline <= now) {
        continue
      }

      if (nextDeadline === undefined || deadline < nextDeadline) {
        nextDeadline = deadline
      }
    }

    return nextDeadline === undefined
      ? undefined
      : Math.max(0, nextDeadline - now)
  }
}

function resolvePeerWsUrl(message: ClusterMessage): string {
  switch (message.type) {
    case 'clusterHello':
      return message.wsUrl
    case 'clusterHeartbeat':
      return message.leaderUrl
    case 'clusterVoteRequest':
      return message.candidateUrl
    case 'clusterHeartbeatAck':
    case 'clusterVoteResponse':
    case 'clusterLeaderResign':
    case 'clusterRpcRequest':
    case 'clusterRpcResponse':
      return ''
  }
}

function resolvePeerClusterUrl(message: ClusterMessage): string {
  if (message.type === 'clusterHello') {
    return message.clusterUrl
  }

  return ''
}

function inferPeerRole(
  message: ClusterMessage,
  fallback: ClusterRole
): ClusterRole {
  switch (message.type) {
    case 'clusterHello':
      return message.role
    case 'clusterHeartbeat':
      return 'leader'
    case 'clusterVoteRequest':
      return 'candidate'
    case 'clusterRpcRequest':
    case 'clusterRpcResponse':
    default:
      return fallback
  }
}

function firstOpenLink(links: Set<ClusterPeerLink>): ClusterPeerLink | undefined {
  for (const link of links) {
    if (link.socket.readyState === WebSocket.OPEN) {
      return link
    }
  }

  return undefined
}

function clusterStatesEqual(
  left: ClusterManagerState,
  right: ClusterManagerState
): boolean {
  return left.id === right.id &&
    left.membershipMode === right.membershipMode &&
    left.membershipFingerprint === right.membershipFingerprint &&
    left.role === right.role &&
    left.term === right.term &&
    left.leaderId === right.leaderId &&
    left.leaderUrl === right.leaderUrl &&
    left.leaseDurationMs === right.leaseDurationMs &&
    left.knownMemberCount === right.knownMemberCount &&
    left.reachableMemberCount === right.reachableMemberCount &&
    left.quorumSize === right.quorumSize &&
    left.hasQuorum === right.hasQuorum
}

async function closeLink(link: ClusterPeerLink): Promise<void> {
  if (
    link.socket.readyState === WebSocket.CLOSED ||
    link.socket.readyState === WebSocket.CLOSING
  ) {
    return
  }

  await new Promise<void>((resolve) => {
    link.socket.once('close', () => {
      resolve()
    })
    link.socket.close()
  })
}

function normalizeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}
