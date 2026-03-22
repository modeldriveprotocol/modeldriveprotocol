export type ClusterRole = 'leader' | 'follower' | 'candidate'

export interface ClusterHelloMessage {
  type: 'clusterHello'
  clusterId: string
  membershipMode: 'dynamic' | 'static'
  membershipFingerprint: string
  serverId: string
  term: number
  role: ClusterRole
  wsUrl: string
  clusterUrl: string
  timestamp: number
  leaderId?: string
  leaderUrl?: string
}

export interface ClusterHeartbeatMessage {
  type: 'clusterHeartbeat'
  clusterId: string
  serverId: string
  term: number
  leaderId: string
  leaderUrl: string
  leaseDurationMs: number
  timestamp: number
}

export interface ClusterHeartbeatAckMessage {
  type: 'clusterHeartbeatAck'
  clusterId: string
  serverId: string
  term: number
  followerId: string
  leaderId: string
  timestamp: number
}

export interface ClusterVoteRequestMessage {
  type: 'clusterVoteRequest'
  clusterId: string
  serverId: string
  term: number
  candidateId: string
  candidateUrl: string
  timestamp: number
}

export interface ClusterVoteResponseMessage {
  type: 'clusterVoteResponse'
  clusterId: string
  serverId: string
  term: number
  voterId: string
  voteGranted: boolean
  timestamp: number
  leaderId?: string
  leaderUrl?: string
}

export interface ClusterLeaderResignMessage {
  type: 'clusterLeaderResign'
  clusterId: string
  serverId: string
  term: number
  leaderId: string
  timestamp: number
}

export type ClusterMessage =
  | ClusterHelloMessage
  | ClusterHeartbeatMessage
  | ClusterHeartbeatAckMessage
  | ClusterVoteRequestMessage
  | ClusterVoteResponseMessage
  | ClusterLeaderResignMessage
