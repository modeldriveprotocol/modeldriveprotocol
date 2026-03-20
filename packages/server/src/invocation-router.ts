import { randomUUID } from "node:crypto";

import type {
  AuthContext,
  CallClientResultMessage,
  CapabilityKind,
  RpcArguments
} from "@modeldriveprotocol/protocol";

import type { CapabilityIndex } from "./capability-index.js";
import type { ClientSession } from "./client-session.js";

export interface InvocationRequest {
  clientId: string;
  kind: CapabilityKind;
  name?: string;
  uri?: string;
  args?: RpcArguments;
  auth?: AuthContext;
}

interface PendingInvocation {
  clientId: string;
  timeout: NodeJS.Timeout;
  resolve: (result: CallClientResultMessage) => void;
  reject: (error: Error) => void;
}

export class InvocationRouter {
  private readonly pending = new Map<string, PendingInvocation>();

  constructor(
    private readonly getSession: (clientId: string) => ClientSession | undefined,
    private readonly capabilityIndex: CapabilityIndex,
    private readonly timeoutMs: number
  ) {}

  invoke(request: InvocationRequest): Promise<CallClientResultMessage> {
    this.assertTarget(request);

    const session = this.getSession(request.clientId);

    if (!session) {
      throw new Error(`Client "${request.clientId}" is not connected`);
    }

    const requestId = randomUUID();

    return new Promise<CallClientResultMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Invocation timed out for client "${request.clientId}"`));
      }, this.timeoutMs);

      this.pending.set(requestId, {
        clientId: request.clientId,
        timeout,
        resolve,
        reject
      });

      try {
        session.send({
          type: "callClient",
          requestId,
          clientId: request.clientId,
          kind: request.kind,
          ...(request.name ? { name: request.name } : {}),
          ...(request.uri ? { uri: request.uri } : {}),
          ...(request.args ? { args: request.args } : {}),
          ...(request.auth ? { auth: request.auth } : {})
        });
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(requestId);
        reject(asError(error));
      }
    });
  }

  resolve(result: CallClientResultMessage): boolean {
    const pending = this.pending.get(result.requestId);

    if (!pending) {
      return false;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(result.requestId);
    pending.resolve(result);
    return true;
  }

  rejectClient(clientId: string, error: Error): void {
    for (const [requestId, pending] of this.pending.entries()) {
      if (pending.clientId !== clientId) {
        continue;
      }

      clearTimeout(pending.timeout);
      this.pending.delete(requestId);
      pending.reject(error);
    }
  }

  private assertTarget(request: InvocationRequest): void {
    if (request.kind === "resource") {
      if (!request.uri) {
        throw new Error("Resource invocations require a uri");
      }
    } else if (!request.name) {
      throw new Error(`Capability kind "${request.kind}" requires a name`);
    }

    if (
      !this.capabilityIndex.hasTarget({
        clientId: request.clientId,
        kind: request.kind,
        ...(request.name ? { name: request.name } : {}),
        ...(request.uri ? { uri: request.uri } : {})
      })
    ) {
      throw new Error(
        `Capability "${request.name ?? request.uri ?? "unknown"}" was not found on client "${request.clientId}"`
      );
    }
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
