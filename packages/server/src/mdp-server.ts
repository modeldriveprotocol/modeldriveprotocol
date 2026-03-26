import type {
  AuthContext,
  ClientDescriptor,
  ClientToServerMessage,
  PathDescriptor,
  ListedClient
} from '@modeldriveprotocol/protocol'
import { createSerializedError } from '@modeldriveprotocol/protocol'

import {
  type ListClientsOptions,
  type PathTarget,
  type RegisteredClientSnapshot,
  CapabilityIndex
} from './capability-index.js'
import { type ClientSessionTransport, ClientSession } from './client-session.js'
import {
  type InvocationRequest,
  type ResolvedInvocationRequest,
  InvocationRouter
} from './invocation-router.js'

export interface RegistrationAuthorizationContext {
  session: ClientSession
  client: ClientDescriptor
  auth?: AuthContext
  transportAuth?: AuthContext
}

export interface InvocationAuthorizationContext extends ResolvedInvocationRequest {
  session: ClientSession
  registeredAuth?: AuthContext
  transportAuth?: AuthContext
}

export interface ClientRegisteredContext {
  session: ClientSession
  client: ClientDescriptor
  auth?: AuthContext
}

export interface ClientRemovedContext extends ClientRegisteredContext {
  reason: 'disconnect' | 'unregister'
}

export interface MdpServerOptions {
  heartbeatIntervalMs?: number
  heartbeatTimeoutMs?: number
  invocationTimeoutMs?: number
  authorizeRegistration?: (context: RegistrationAuthorizationContext) => void
  authorizeInvocation?: (context: InvocationAuthorizationContext) => void
  onClientRegistered?: (context: ClientRegisteredContext) => void
  onClientRemoved?: (context: ClientRemovedContext) => void
}

const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 90_000
const DEFAULT_INVOCATION_TIMEOUT_MS = 15_000

export class MdpServerRuntime {
  readonly capabilityIndex: CapabilityIndex
  readonly invocationRouter: InvocationRouter

  private readonly sessionsByConnectionId = new Map<string, ClientSession>()
  private readonly sessionsByClientId = new Map<string, ClientSession>()
  private readonly heartbeatIntervalMs: number
  private readonly heartbeatTimeoutMs: number
  private readonly authorizeRegistration:
    | ((context: RegistrationAuthorizationContext) => void)
    | undefined
  private readonly authorizeInvocation:
    | ((context: InvocationAuthorizationContext) => void)
    | undefined
  private readonly onClientRegistered:
    | ((context: ClientRegisteredContext) => void)
    | undefined
  private readonly onClientRemoved:
    | ((context: ClientRemovedContext) => void)
    | undefined
  private heartbeatTimer: NodeJS.Timeout | undefined

  constructor(options: MdpServerOptions = {}) {
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS
    this.authorizeRegistration = options.authorizeRegistration
    this.authorizeInvocation = options.authorizeInvocation
    this.onClientRegistered = options.onClientRegistered
    this.onClientRemoved = options.onClientRemoved

    this.capabilityIndex = new CapabilityIndex(() => this.getRegisteredSnapshots())
    this.invocationRouter = new InvocationRouter(
      (clientId) => this.sessionsByClientId.get(clientId),
      options.invocationTimeoutMs ?? DEFAULT_INVOCATION_TIMEOUT_MS
    )
  }

  createSession(
    connectionId: string,
    transport: ClientSessionTransport
  ): ClientSession {
    const session = new ClientSession(connectionId, transport)
    this.sessionsByConnectionId.set(connectionId, session)
    return session
  }

  handleMessage(session: ClientSession, message: ClientToServerMessage): void {
    session.markSeen()

    switch (message.type) {
      case 'registerClient':
        this.registerClient(session, message.client, message.auth)
        return
      case 'unregisterClient':
        this.unregisterClient(session, message.clientId)
        return
      case 'updateClientCatalog':
        this.updateClientCatalog(session, message.clientId, message.paths)
        return
      case 'callClientResult':
        this.invocationRouter.resolve(message)
        return
      case 'ping':
        session.send({
          type: 'pong',
          timestamp: message.timestamp
        })
        return
      case 'pong':
        return
    }
  }

  disconnectSession(connectionId: string): void {
    const session = this.sessionsByConnectionId.get(connectionId)

    if (!session) {
      return
    }

    const clientId = session.clientId
    const descriptor = session.descriptor
    const registeredAuth = session.registeredAuth

    if (clientId && this.sessionsByClientId.get(clientId) === session) {
      this.sessionsByClientId.delete(clientId)
      this.invocationRouter.rejectClient(
        clientId,
        new Error(`Client "${clientId}" disconnected`)
      )
    }

    if (descriptor) {
      this.onClientRemoved?.({
        session,
        client: descriptor,
        ...(registeredAuth ? { auth: registeredAuth } : {}),
        reason: 'disconnect'
      })
    }

    this.sessionsByConnectionId.delete(connectionId)
    session.close()
  }

  listClients(options: ListClientsOptions = {}): ListedClient[] {
    return this.capabilityIndex.listClients(options)
  }

  invoke(request: InvocationRequest) {
    const session = this.sessionsByClientId.get(request.clientId)

    if (!session) {
      throw new Error(`Client "${request.clientId}" is not connected`)
    }

    const resolved = this.resolveInvocation(request)

    this.authorizeInvocation?.({
      ...resolved,
      session,
      ...(session.registeredAuth ? { registeredAuth: session.registeredAuth } : {}),
      ...(session.transportAuth ? { transportAuth: session.transportAuth } : {})
    })

    return this.invocationRouter.invoke(resolved)
  }

  findMatchingClientIds(target: Omit<PathTarget, 'clientId'>): string[] {
    return this.capabilityIndex.findMatchingClientIds(target)
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return
    }

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now()

      for (const session of this.sessionsByConnectionId.values()) {
        if (now - session.lastSeenAt.getTime() > this.heartbeatTimeoutMs) {
          this.disconnectSession(session.connectionId)
          continue
        }

        try {
          session.send({
            type: 'ping',
            timestamp: Date.now()
          })
        } catch {
          this.disconnectSession(session.connectionId)
        }
      }
    }, this.heartbeatIntervalMs)

    this.heartbeatTimer.unref?.()
  }

  async close(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }

    for (const session of this.sessionsByConnectionId.values()) {
      const clientId = session.clientId

      if (clientId) {
        this.invocationRouter.rejectClient(
          clientId,
          new Error(`Client "${clientId}" disconnected`)
        )
      }

      session.close()
    }

    this.sessionsByConnectionId.clear()
    this.sessionsByClientId.clear()
  }

  private registerClient(
    session: ClientSession,
    descriptor: ClientDescriptor,
    auth?: AuthContext
  ): void {
    this.authorizeRegistration?.({
      session,
      client: descriptor,
      ...(auth ? { auth } : {}),
      ...(session.transportAuth ? { transportAuth: session.transportAuth } : {})
    })

    const previousClientId = session.clientId
    const previousDescriptor = session.descriptor
    const previousRegisteredAuth = session.registeredAuth

    if (
      previousClientId &&
      previousClientId !== descriptor.id &&
      this.sessionsByClientId.get(previousClientId) === session
    ) {
      this.sessionsByClientId.delete(previousClientId)
      this.invocationRouter.rejectClient(
        previousClientId,
        new Error(`Client "${previousClientId}" was re-registered as "${descriptor.id}"`)
      )
    }

    if (previousDescriptor && previousClientId && previousClientId !== descriptor.id) {
      this.onClientRemoved?.({
        session,
        client: previousDescriptor,
        ...(previousRegisteredAuth ? { auth: previousRegisteredAuth } : {}),
        reason: 'unregister'
      })
    }

    const existing = this.sessionsByClientId.get(descriptor.id)

    if (existing && existing !== session) {
      existing.close(4000, 'Replaced by newer client session')
      this.disconnectSession(existing.connectionId)
    }

    session.register(descriptor, auth)
    this.sessionsByClientId.set(descriptor.id, session)
    this.onClientRegistered?.({
      session,
      client: descriptor,
      ...(auth ? { auth } : {})
    })
  }

  private unregisterClient(session: ClientSession, clientId: string): void {
    if (session.clientId !== clientId) {
      return
    }

    if (this.sessionsByClientId.get(clientId) === session) {
      this.sessionsByClientId.delete(clientId)
      this.invocationRouter.rejectClient(
        clientId,
        new Error(`Client "${clientId}" was unregistered`)
      )
    }

    const descriptor = session.descriptor
    const registeredAuth = session.registeredAuth

    if (descriptor) {
      this.onClientRemoved?.({
        session,
        client: descriptor,
        ...(registeredAuth ? { auth: registeredAuth } : {}),
        reason: 'unregister'
      })
    }

    session.unregister()
  }

  private updateClientCatalog(
    session: ClientSession,
    clientId: string,
    paths: PathDescriptor[]
  ): void {
    if (!session.descriptor || session.clientId !== clientId) {
      throw new Error(`Client "${clientId}" is not registered on this session`)
    }

    const descriptor = session.descriptor
    const nextDescriptor: ClientDescriptor = {
      ...descriptor,
      paths
    }

    session.register(nextDescriptor, session.registeredAuth)
    this.sessionsByClientId.set(clientId, session)
    this.onClientRegistered?.({
      session,
      client: nextDescriptor,
      ...(session.registeredAuth ? { auth: session.registeredAuth } : {})
    })
  }

  private getRegisteredSnapshots(): RegisteredClientSnapshot[] {
    return [...this.sessionsByClientId.values()]
      .filter((session) => session.descriptor !== undefined)
      .map((session) => ({
        descriptor: session.descriptor as ClientDescriptor,
        connectedAt: session.connectedAt,
        lastSeenAt: session.lastSeenAt,
        connection: session.connection
      }))
  }

  private resolveInvocation(request: InvocationRequest): ResolvedInvocationRequest {
    const resolved = this.capabilityIndex.resolveTarget(
      request.clientId,
      request.method,
      request.path
    )

    if (!resolved) {
      throw new Error(
        `Path "${request.path}" with method "${request.method}" was not found on client "${request.clientId}"`
      )
    }

    return {
      ...request,
      type: resolved.descriptor.type,
      params: resolved.params
    }
  }
}

export function toToolError(error: unknown) {
  const normalized = error instanceof Error ? error : new Error('Unknown MDP server error')

  return createSerializedError('handler_error', normalized.message)
}
