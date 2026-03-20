import type { ClientDescriptor, ClientToServerMessage, ListedClient } from "@mdp/protocol";
import { createSerializedError } from "@mdp/protocol";
import type WebSocket from "ws";

import { CapabilityIndex, type CapabilityTarget, type RegisteredClientSnapshot } from "./capability-index.js";
import { ClientSession } from "./client-session.js";
import { InvocationRouter, type InvocationRequest } from "./invocation-router.js";

export interface MdpServerOptions {
  heartbeatIntervalMs?: number;
  invocationTimeoutMs?: number;
}

const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const DEFAULT_INVOCATION_TIMEOUT_MS = 15_000;

export class MdpServerRuntime {
  readonly capabilityIndex: CapabilityIndex;
  readonly invocationRouter: InvocationRouter;

  private readonly sessionsByConnectionId = new Map<string, ClientSession>();
  private readonly sessionsByClientId = new Map<string, ClientSession>();
  private readonly heartbeatIntervalMs: number;
  private heartbeatTimer: NodeJS.Timeout | undefined;

  constructor(options: MdpServerOptions = {}) {
    this.heartbeatIntervalMs =
      options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;

    this.capabilityIndex = new CapabilityIndex(() => this.getRegisteredSnapshots());
    this.invocationRouter = new InvocationRouter(
      (clientId) => this.sessionsByClientId.get(clientId),
      this.capabilityIndex,
      options.invocationTimeoutMs ?? DEFAULT_INVOCATION_TIMEOUT_MS
    );
  }

  createSession(connectionId: string, socket: WebSocket): ClientSession {
    const session = new ClientSession(connectionId, socket);
    this.sessionsByConnectionId.set(connectionId, session);
    return session;
  }

  handleMessage(session: ClientSession, message: ClientToServerMessage): void {
    session.markSeen();

    switch (message.type) {
      case "registerClient":
        this.registerClient(session, message.client);
        return;
      case "unregisterClient":
        this.unregisterClient(session, message.clientId);
        return;
      case "callClientResult":
        this.invocationRouter.resolve(message);
        return;
      case "ping":
        session.send({
          type: "pong",
          timestamp: message.timestamp
        });
        return;
      case "pong":
        return;
    }
  }

  disconnectSession(connectionId: string): void {
    const session = this.sessionsByConnectionId.get(connectionId);

    if (!session) {
      return;
    }

    const clientId = session.clientId;

    if (clientId && this.sessionsByClientId.get(clientId) === session) {
      this.sessionsByClientId.delete(clientId);
      this.invocationRouter.rejectClient(
        clientId,
        new Error(`Client "${clientId}" disconnected`)
      );
    }

    this.sessionsByConnectionId.delete(connectionId);
  }

  listClients(): ListedClient[] {
    return this.capabilityIndex.listClients();
  }

  invoke(request: InvocationRequest) {
    return this.invocationRouter.invoke(request);
  }

  findMatchingClientIds(target: Omit<CapabilityTarget, "clientId">): string[] {
    return this.capabilityIndex.findMatchingClientIds(target);
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      for (const session of this.sessionsByConnectionId.values()) {
        try {
          session.send({
            type: "ping",
            timestamp: Date.now()
          });
        } catch {
          this.disconnectSession(session.connectionId);
        }
      }
    }, this.heartbeatIntervalMs);

    this.heartbeatTimer.unref?.();
  }

  async close(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    for (const session of this.sessionsByConnectionId.values()) {
      const clientId = session.clientId;

      if (clientId) {
        this.invocationRouter.rejectClient(
          clientId,
          new Error(`Client "${clientId}" disconnected`)
        );
      }

      session.close();
    }

    this.sessionsByConnectionId.clear();
    this.sessionsByClientId.clear();
  }

  private registerClient(session: ClientSession, descriptor: ClientDescriptor): void {
    const previousClientId = session.clientId;

    if (
      previousClientId &&
      previousClientId !== descriptor.id &&
      this.sessionsByClientId.get(previousClientId) === session
    ) {
      this.sessionsByClientId.delete(previousClientId);
    }

    const existing = this.sessionsByClientId.get(descriptor.id);

    if (existing && existing !== session) {
      existing.close(4000, "Replaced by newer client session");
      this.disconnectSession(existing.connectionId);
    }

    session.register(descriptor);
    this.sessionsByClientId.set(descriptor.id, session);
  }

  private unregisterClient(session: ClientSession, clientId: string): void {
    if (session.clientId !== clientId) {
      return;
    }

    if (this.sessionsByClientId.get(clientId) === session) {
      this.sessionsByClientId.delete(clientId);
      this.invocationRouter.rejectClient(
        clientId,
        new Error(`Client "${clientId}" was unregistered`)
      );
    }

    session.unregister();
  }

  private getRegisteredSnapshots(): RegisteredClientSnapshot[] {
    return [...this.sessionsByClientId.values()]
      .filter((session) => session.descriptor !== undefined)
      .map((session) => ({
        descriptor: session.descriptor as ClientDescriptor,
        connectedAt: session.connectedAt,
        lastSeenAt: session.lastSeenAt
      }));
  }
}

export function toToolError(error: unknown) {
  const normalized =
    error instanceof Error ? error : new Error("Unknown MDP server error");

  return createSerializedError("handler_error", normalized.message);
}
